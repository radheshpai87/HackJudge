import { Router } from "express";
import { z } from "zod";
import { success, error } from "@hackjudge/shared";
import { validateConfig } from "@hackjudge/config-engine";

const router = Router();

/* ─── GROQ / MISTRAL CONFIG GENERATOR ─── */

const SYSTEM_PROMPT = `You are an expert hackathon organizer. Generate a valid HackJudge event.yaml config.

Required top-level fields:
- version: "1"
- event: { name, slug (lowercase alphanumeric-hyphens), description, timezone (IANA e.g. "America/New_York") }
- tracks: array of { id (lowercase alphanumeric-underscore), name, description }
- criteria: array of { id, name, description, max_score (int), weight (positive), track_id (null or existing track id), scoring_type ("numeric" or "rubric"), rubric (array of {score, label, description} — REQUIRED when scoring_type is "rubric") }
- teams: array of { id, name, track_id (null or existing track id), members (array of strings), table_number (string, optional) }
- judges: array of { id, name, email, tracks (array of track ids or ["all"]) }
- assignment: { mode ("free" | "assigned" | "hybrid"), assigned_teams (array of {judge_id, team_ids}), min_judges_per_team (int), allow_self_scoring (bool) }
- moderation: { enabled (bool), outlier_threshold (number), allow_organizer_override (bool), require_panel_discussion (bool), lock_results_after (ISO datetime with offset or null) }
- results: { tiebreaker ("higher_avg" | "more_judges" | "manual"), show_scores_to_judges (bool), export: { pdf_certificates (bool), csv (bool), webhook_url (null), webhook_secret (null) } }

CRITICAL RULES:
1. version MUST be exactly "1"
2. Track IDs: ONLY lowercase letters, digits, underscores (e.g. ai_track, web3_dev)
3. Event slug: ONLY lowercase letters, digits, hyphens
4. WEIGHTS MUST SUM TO 1.0 per track_id: group ALL criteria by track_id (null = "all"). The weight values in each group must add to exactly 1.0. Example: if track "ai_track" has 2 criteria, weights 0.5 and 0.5. If "all" has 4 criteria, weights 0.25, 0.25, 0.25, 0.25.
5. Rubric criteria MUST have rubric array with {score (int), label (string), description (string)}.
6. Use assignment.mode = "free" to avoid complex validation. If you use "assigned", every assigned_teams entry must reference a judge ID, and each team_id must be a valid team. The judge must cover that team's track_id in their tracks array.

Output ONLY the raw YAML. No markdown fences, no explanations.`;

function buildUserPrompt(description: string) {
  return `Create an event.yaml for this hackathon:

"""${description}"""

Generate a complete, realistic config with at least 3 tracks, 4-6 criteria, 8-15 teams, and 3-5 judges. Use scoring_type "rubric" for at least 2 criteria and "numeric" for the rest. Make sure all track_ids in criteria, teams, and judges reference existing tracks.`;
}

async function callGroq(apiKey: string, userPrompt: string) {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Groq API error ${resp.status}: ${body}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callMistral(apiKey: string, userPrompt: string) {
  const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Mistral API error ${resp.status}: ${body}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callOllama(userPrompt: string) {
  // Default Ollama endpoint on localhost
  const resp = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2",
      prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      stream: false,
      options: { temperature: 0.4, num_ctx: 8192 },
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Ollama error ${resp.status}: ${body}`);
  }
  const data = await resp.json();
  return data.response ?? "";
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```yaml\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

router.post("/generate-config", async (req, res) => {
  const schema = z.object({ description: z.string().min(3) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid request", parse.error.format()));
    return;
  }

  const userPrompt = buildUserPrompt(parse.data.description);
  let yaml = "";
  let provider = "";

  const groqKey = process.env.GROQ_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;

  try {
    if (groqKey) {
      provider = "groq";
      yaml = await callGroq(groqKey, userPrompt);
    } else if (mistralKey) {
      provider = "mistral";
      yaml = await callMistral(mistralKey, userPrompt);
    } else {
      // Try Ollama as free fallback
      provider = "ollama";
      yaml = await callOllama(userPrompt);
    }
  } catch (e: any) {
    res.status(502).json(error("AI_GENERATION_FAILED", e.message || "AI generation failed"));
    return;
  }

  yaml = stripMarkdownFences(yaml);

  if (!yaml.includes("event:") || !yaml.includes("teams:") || !yaml.includes("judges:")) {
    res.status(502).json(error("AI_GENERATION_FAILED", "Generated content is not valid YAML. Try again with a more detailed description."));
    return;
  }

  // Validate generated YAML server-side before returning
  try {
    const yamlLib = await import("js-yaml");
    const parsed = yamlLib.load(yaml);

    // js-yaml parses ISO dates as native Date objects; convert back to strings
    function deepStringifyDates(obj: unknown): unknown {
      if (obj instanceof Date) return obj.toISOString();
      if (Array.isArray(obj)) return obj.map(deepStringifyDates);
      if (obj !== null && typeof obj === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) out[k] = deepStringifyDates(v);
        return out;
      }
      return obj;
    }
    let fixed = deepStringifyDates(parsed);

    // Normalize judge tracks: AI sometimes outputs booleans or unquoted strings
    if (fixed && typeof fixed === 'object' && 'judges' in fixed && Array.isArray((fixed as any).judges)) {
      for (const j of (fixed as any).judges) {
        if (j.tracks === true || j.tracks === 'all' || j.tracks === null || j.tracks === undefined) {
          j.tracks = 'all';
        } else if (typeof j.tracks === 'string') {
          j.tracks = [j.tracks];
        }
      }
    }

    // Auto-fix common AI mistakes before validation
    const cfg = fixed as any;
    if (cfg.criteria && Array.isArray(cfg.criteria)) {
      // Normalize weights per track to sum to 1.0
      const byTrack = new Map<string, any[]>();
      for (const c of cfg.criteria) {
        const key = c.track_id ?? 'all';
        const arr = byTrack.get(key) ?? [];
        arr.push(c);
        byTrack.set(key, arr);
      }
      for (const [, crits] of byTrack) {
        const sum = crits.reduce((s: number, c: any) => s + (Number(c.weight) || 0), 0);
        if (sum > 0 && Math.abs(sum - 1.0) > 0.001) {
          const factor = 1.0 / sum;
          for (const c of crits) c.weight = Number((c.weight * factor).toFixed(3));
        }
      }
    }

    // Fix invalid assignments: switch to free mode if assigned_teams has errors
    if (cfg.assignment && cfg.assignment.mode !== 'free') {
      const judgeMap = new Map((cfg.judges ?? []).map((j: any) => [j.id, j]));
      const teamMap = new Map((cfg.teams ?? []).map((t: any) => [t.id, t]));
      const validAssignments: any[] = [];
      for (const a of (cfg.assignment.assigned_teams ?? [])) {
        const judge: any = judgeMap.get(a.judge_id);
        if (!judge) continue;
        const validTeams: string[] = [];
        for (const tid of (a.team_ids ?? [])) {
          const team: any = teamMap.get(tid);
          if (!team) continue;
          // Judge must cover team's track
          const trackOk = judge.tracks === 'all' || (Array.isArray(judge.tracks) && judge.tracks.includes('all'));
          const coversTrack = trackOk || (Array.isArray(judge.tracks) && judge.tracks.includes(team.track_id));
          if (coversTrack) validTeams.push(tid);
        }
        if (validTeams.length > 0) validAssignments.push({ judge_id: a.judge_id, team_ids: validTeams });
      }
      if (validAssignments.length === 0) {
        cfg.assignment.mode = 'free';
        cfg.assignment.assigned_teams = [];
      } else {
        cfg.assignment.assigned_teams = validAssignments;
      }
    }

    const validation = validateConfig(fixed);
    if (!validation.success) {
      const issues = validation.errors!.map((e) => `${e.path}: ${e.message}`).join("\n");
      res.status(502).json(error("AI_GENERATION_FAILED", `Generated YAML failed validation:\n${issues}`));
      return;
    }
  } catch (e: any) {
    res.status(502).json(error("AI_GENERATION_FAILED", `YAML parse error: ${e.message}`));
    return;
  }

  res.json(success({ yaml, provider }));
});

export default router;
