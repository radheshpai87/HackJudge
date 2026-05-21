import { NextRequest } from "next/server";
import { z } from "zod";
import { success, apiError } from "@/lib/api-response";
import { validateConfig } from "@hackjudge/config-engine";

const SYSTEM_PROMPT = `You are an expert hackathon organizer. Generate a valid HackJudge event.yaml config.

Required top-level fields:
- version: "1"
- event: { name, slug (lowercase alphanumeric-hyphens), description, timezone (IANA e.g. "America/New_York") }
- tracks: array of { id (lowercase alphanumeric_underscore), name, description }
- criteria: array of { id, name, description, max_score (int), weight (positive), track_id (null or existing track id), scoring_type ("numeric" or "rubric"), rubric (array of {score, label, description} — REQUIRED when scoring_type is "rubric") }
- teams: array of { id, name, track_id (null or existing track id), members (array of strings), table_number (string, optional) }
- judges: array of { id, name, email, tracks (array of track ids or ["all"]) }
- assignment: { mode ("free" | "assigned" | "hybrid"), assigned_teams (array of {judge_id, team_ids}), min_judges_per_team (int), allow_self_scoring (bool) }
- moderation: { enabled (bool), outlier_threshold (number), allow_organizer_override (bool), require_panel_discussion (bool), lock_results_after (ISO datetime with offset or null) }
- results: { tiebreaker ("higher_avg" | "more_judges" | "manual"), show_scores_to_judges (bool), export: { pdf_certificates (bool), csv (bool), webhook_url (null), webhook_secret (null) } }

CRITICAL RULES:
1. version MUST be exactly "1"
2. Track IDs: ONLY lowercase letters, digits, underscores
3. Event slug: ONLY lowercase letters, digits, hyphens
4. WEIGHTS MUST SUM TO 1.0 per track_id
5. Rubric criteria MUST have rubric array with {score (int), label (string), description (string)}
6. Use assignment.mode = "free" to avoid complex validation

Output ONLY the raw YAML. No markdown fences, no explanations.`;

function buildUserPrompt(description: string) {
  return `Create an event.yaml for this hackathon:\n\n"""${description}"""\n\nGenerate a complete, realistic config with at least 3 tracks, 4-6 criteria, 8-15 teams, and 3-5 judges. Use scoring_type "rubric" for at least 2 criteria.`;
}

async function callGroq(apiKey: string, userPrompt: string) {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }], temperature: 0.4, max_tokens: 4096 }),
  });
  if (!resp.ok) throw new Error(`Groq API error ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callMistral(apiKey: string, userPrompt: string) {
  const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "mistral-large-latest", messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }], temperature: 0.4, max_tokens: 4096 }),
  });
  if (!resp.ok) throw new Error(`Mistral API error ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function stripMarkdownFences(text: string): string {
  return text.replace(/^```yaml\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

function deepStringifyDates(obj: unknown): unknown {
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(deepStringifyDates);
  if (obj !== null && typeof obj === "object") { const out: Record<string, unknown> = {}; for (const [k, v] of Object.entries(obj)) out[k] = deepStringifyDates(v); return out; }
  return obj;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schema = z.object({ description: z.string().min(3) });
    const parse = schema.safeParse(body);
    if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request", parse.error.format());

    const userPrompt = buildUserPrompt(parse.data.description);
    let yaml = "";
    let provider = "";

    const groqKey = process.env.GROQ_API_KEY;
    const mistralKey = process.env.MISTRAL_API_KEY;

    try {
      if (groqKey) { provider = "groq"; yaml = await callGroq(groqKey, userPrompt); }
      else if (mistralKey) { provider = "mistral"; yaml = await callMistral(mistralKey, userPrompt); }
      else return apiError("AI_GENERATION_FAILED", "No AI provider configured. Set GROQ_API_KEY or MISTRAL_API_KEY.", null, 502);
    } catch (e: any) {
      return apiError("AI_GENERATION_FAILED", e.message || "AI generation failed", null, 502);
    }

    yaml = stripMarkdownFences(yaml);
    if (!yaml.includes("event:") || !yaml.includes("teams:") || !yaml.includes("judges:")) {
      return apiError("AI_GENERATION_FAILED", "Generated content is not valid YAML", null, 502);
    }

    try {
      const yamlLib = await import("js-yaml");
      const parsed = yamlLib.load(yaml);
      let fixed = deepStringifyDates(parsed);
      if (fixed && typeof fixed === "object" && "judges" in fixed && Array.isArray((fixed as any).judges)) {
        for (const j of (fixed as any).judges) {
          if (j.tracks === true || j.tracks === "all" || j.tracks === null || j.tracks === undefined) j.tracks = "all";
          else if (typeof j.tracks === "string") j.tracks = [j.tracks];
        }
      }
      const cfg = fixed as any;
      if (cfg.criteria && Array.isArray(cfg.criteria)) {
        const byTrack = new Map<string, any[]>();
        for (const c of cfg.criteria) { const key = c.track_id ?? "all"; const arr = byTrack.get(key) ?? []; arr.push(c); byTrack.set(key, arr); }
        byTrack.forEach((crits) => {
          const sum = crits.reduce((s: number, c: any) => s + (Number(c.weight) || 0), 0);
          if (sum > 0 && Math.abs(sum - 1.0) > 0.001) { const factor = 1.0 / sum; for (const c of crits) c.weight = Number((c.weight * factor).toFixed(3)); }
        });
      }
      if (cfg.assignment && cfg.assignment.mode !== "free") {
        const judgeMap = new Map((cfg.judges ?? []).map((j: any) => [j.id, j]));
        const teamMap = new Map((cfg.teams ?? []).map((t: any) => [t.id, t]));
        const validAssignments: any[] = [];
        for (const a of (cfg.assignment.assigned_teams ?? [])) {
          const judge: any = judgeMap.get(a.judge_id); if (!judge) continue;
          const validTeams: string[] = [];
          for (const tid of (a.team_ids ?? [])) {
            const team: any = teamMap.get(tid); if (!team) continue;
            const trackOk = judge.tracks === "all" || (Array.isArray(judge.tracks) && judge.tracks.includes("all"));
            if (trackOk || (Array.isArray(judge.tracks) && judge.tracks.includes(team.track_id))) validTeams.push(tid);
          }
          if (validTeams.length > 0) validAssignments.push({ judge_id: a.judge_id, team_ids: validTeams });
        }
        if (validAssignments.length === 0) { cfg.assignment.mode = "free"; cfg.assignment.assigned_teams = []; }
        else cfg.assignment.assigned_teams = validAssignments;
      }
      const validation = validateConfig(fixed);
      if (!validation.success) {
        const issues = validation.errors!.map((e) => `${e.path}: ${e.message}`).join("\n");
        return apiError("AI_GENERATION_FAILED", `Generated YAML failed validation:\n${issues}`, null, 502);
      }
    } catch (e: any) {
      return apiError("AI_GENERATION_FAILED", `YAML parse error: ${e.message}`, null, 502);
    }

    return success({ yaml, provider });
  } catch (e: any) {
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message, null, 500);
  }
}
