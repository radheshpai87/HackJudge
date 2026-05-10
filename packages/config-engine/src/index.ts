/**
 * Config engine: YAML parser, Zod validator, and typed schemas for event.yaml.
 */

import { readFile } from "fs/promises";
import yaml from "js-yaml";
import { z } from "zod";

/**
 * Error thrown when config validation fails.
 */
export class ConfigValidationError extends Error {
  constructor(public readonly errors: Array<{ path: string; message: string }>) {
    super(`Config validation failed: ${errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`);
    this.name = "ConfigValidationError";
  }
}

export interface ValidationResult {
  success: boolean;
  errors?: Array<{ path: string; message: string }>;
}

// --- Zod Schemas ---

const rubricLevelSchema = z.object({
  score: z.number().int().describe("Numeric score for this rubric level"),
  label: z.string().min(1).describe("Short label for the level"),
  description: z.string().describe("Detailed description of what this level means"),
});

const criterionSchema = z.object({
  id: z.string().min(1).describe("Unique identifier for this criterion"),
  name: z.string().min(1).describe("Display name shown on scoring screen"),
  description: z.string().optional().describe("Tooltip / hint text"),
  max_score: z.number().int().positive().describe("Maximum score for this criterion"),
  weight: z.number().positive().describe("Weight of this criterion in the track"),
  track_id: z.string().nullable().describe("null = applies to all tracks"),
  scoring_type: z.enum(["numeric", "rubric"]).default("numeric").describe("Scoring input type"),
  rubric: z.array(rubricLevelSchema).optional().describe("Required when scoring_type is rubric"),
});

const trackSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/).describe("Unique URL-safe track ID"),
  name: z.string().min(1).describe("Display name of the track"),
  description: z.string().optional().describe("Track description"),
});

const teamSchema = z.object({
  id: z.string().min(1).describe("Unique team identifier"),
  name: z.string().min(1).describe("Team display name"),
  track_id: z.string().nullable().describe("null = competes in all tracks"),
  members: z.array(z.string()).optional().describe("Team member names (display only)"),
  table_number: z.string().optional().describe("Physical table number for navigation"),
});

const judgeSchema = z.object({
  id: z.string().min(1).describe("Unique judge identifier"),
  name: z.string().min(1).describe("Judge display name"),
  email: z.string().email().describe("Judge email address"),
  tracks: z.union([z.array(z.string()), z.literal("all")]).describe("Tracks this judge scores"),
});

const assignmentSchema = z.object({
  mode: z.enum(["assigned", "free", "hybrid"]).describe("Team assignment mode"),
  assigned_teams: z
    .array(
      z.object({
        judge_id: z.string().describe("Judge ID"),
        team_ids: z.array(z.string()).describe("Teams assigned to this judge"),
      })
    )
    .optional()
    .describe("Required when mode is assigned or hybrid"),
  min_judges_per_team: z.number().int().positive().default(1).describe("Minimum judges per team"),
  allow_self_scoring: z.boolean().default(false).describe("Block judges from scoring their own team"),
});

const moderationSchema = z.object({
  enabled: z.boolean().default(false).describe("Enable score moderation"),
  outlier_threshold: z.number().positive().default(1.5).describe("Std deviations to flag outlier"),
  allow_organizer_override: z.boolean().default(false).describe("Allow organizer to override scores"),
  require_panel_discussion: z.boolean().default(false).describe("Require panel discussion for outliers"),
  lock_results_after: z.string().datetime({ offset: true }).nullable().default(null).describe("After this, scores become immutable"),
});

const exportSchema = z.object({
  pdf_certificates: z.boolean().default(true).describe("Generate PDF certificates"),
  csv: z.boolean().default(true).describe("Generate CSV export"),
  webhook_url: z.string().url().nullable().default(null).describe("Webhook URL for results"),
  webhook_secret: z.string().nullable().default(null).describe("HMAC secret for webhook signature"),
});

const resultsSchema = z.object({
  tiebreaker: z.enum(["higher_avg", "more_judges", "manual"]).default("higher_avg").describe("Tiebreaker strategy"),
  show_scores_to_judges: z.boolean().default(false).describe("Show scores to judges after close"),
  export: exportSchema.describe("Export configuration"),
});

const eventMetaSchema = z.object({
  name: z.string().min(1).describe("Display name of the hackathon"),
  slug: z.string().regex(/^[a-z0-9-]+$/).describe("URL-safe identifier"),
  description: z.string().optional().describe("Shown on judge welcome screen"),
  timezone: z.string().min(1).describe("IANA timezone string"),
  judging_opens_at: z.string().datetime({ offset: true }).describe("Judging opens at (ISO8601)"),
  judging_closes_at: z.string().datetime({ offset: true }).describe("Judging closes at (ISO8601)"),
  logo_url: z.string().url().optional().describe("Logo shown in dashboard + app header"),
});

export const eventConfigSchema = z
  .object({
    version: z.literal("1").describe("Schema version"),
    event: eventMetaSchema.describe("Event metadata"),
    tracks: z.array(trackSchema).min(0).describe("List of tracks"),
    criteria: z.array(criterionSchema).min(1).describe("Scoring criteria"),
    teams: z.array(teamSchema).min(0).describe("Participating teams"),
    judges: z.array(judgeSchema).min(0).describe("Judges"),
    assignment: assignmentSchema.describe("Team assignment configuration"),
    moderation: moderationSchema.describe("Moderation settings"),
    results: resultsSchema.describe("Results configuration"),
  })
  .superRefine((data, ctx) => {
    // Validate judging times
    const opens = new Date(data.event.judging_opens_at);
    const closes = new Date(data.event.judging_closes_at);
    if (opens >= closes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "judging_opens_at must be before judging_closes_at",
        path: ["event", "judging_closes_at"],
      });
    }

    // Build track ID set
    const trackIds = new Set(data.tracks.map((t) => t.id));
    trackIds.add("all"); // pseudo-track for global criteria

    // Validate track_id references in criteria
    for (let i = 0; i < data.criteria.length; i++) {
      const c = data.criteria[i];
      if (c.track_id !== null && !trackIds.has(c.track_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Criterion '${c.id}' references unknown track '${c.track_id}'`,
          path: ["criteria", i, "track_id"],
        });
      }
      // Rubric validation
      if (c.scoring_type === "rubric" && (!c.rubric || c.rubric.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Criterion '${c.id}' scoring_type is rubric but rubric is missing or empty`,
          path: ["criteria", i, "rubric"],
        });
      }
    }

    // Validate track_id references in teams
    for (let i = 0; i < data.teams.length; i++) {
      const t = data.teams[i];
      if (t.track_id !== null && !trackIds.has(t.track_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Team '${t.id}' references unknown track '${t.track_id}'`,
          path: ["teams", i, "track_id"],
        });
      }
    }

    // Validate judge track references
    for (let i = 0; i < data.judges.length; i++) {
      const j = data.judges[i];
      if (Array.isArray(j.tracks)) {
        for (const tid of j.tracks) {
          if (!trackIds.has(tid)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Judge '${j.id}' references unknown track '${tid}'`,
              path: ["judges", i, "tracks"],
            });
          }
        }
      }
    }

    // Validate assignment references
    if (data.assignment.mode !== "free" && data.assignment.assigned_teams) {
      const judgeIds = new Set(data.judges.map((j) => j.id));
      const teamIds = new Set(data.teams.map((t) => t.id));
      for (let i = 0; i < data.assignment.assigned_teams.length; i++) {
        const a = data.assignment.assigned_teams[i];
        if (!judgeIds.has(a.judge_id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Assignment references unknown judge '${a.judge_id}'`,
            path: ["assignment", "assigned_teams", i, "judge_id"],
          });
        }
        for (const tid of a.team_ids) {
          if (!teamIds.has(tid)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Assignment references unknown team '${tid}'`,
              path: ["assignment", "assigned_teams", i, "team_ids"],
            });
          }
        }
        // Validate judge is assigned teams in tracks they cover
        const judge = data.judges.find((j) => j.id === a.judge_id);
        if (judge) {
          for (const tid of a.team_ids) {
            const team = data.teams.find((t) => t.id === tid);
            if (team && team.track_id !== null) {
              if (Array.isArray(judge.tracks) && !judge.tracks.includes(team.track_id)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Judge '${judge.id}' assigned to team '${team.id}' in track '${team.track_id}' which they do not cover`,
                  path: ["assignment", "assigned_teams", i, "team_ids"],
                });
              }
            }
          }
        }
      }
    }

    // Validate criteria weights per track sum to 1.0 (±0.001)
    const trackCriteriaMap = new Map<string, Array<{ id: string; weight: number }>>();
    for (const c of data.criteria) {
      const key = c.track_id ?? "all";
      const arr = trackCriteriaMap.get(key) ?? [];
      arr.push({ id: c.id, weight: c.weight });
      trackCriteriaMap.set(key, arr);
    }
    for (const [trackKey, crits] of trackCriteriaMap.entries()) {
      const sum = crits.reduce((acc, c) => acc + c.weight, 0);
      if (Math.abs(sum - 1.0) > 0.001) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Track '${trackKey}' criteria weights sum to ${sum.toFixed(3)}, must equal 1.0`,
          path: ["criteria"],
        });
      }
    }
  });

export type EventConfig = z.infer<typeof eventConfigSchema>;
export type Criterion = z.infer<typeof criterionSchema>;
export type Track = z.infer<typeof trackSchema>;
export type Team = z.infer<typeof teamSchema>;
export type Judge = z.infer<typeof judgeSchema>;
export type AssignmentConfig = z.infer<typeof assignmentSchema>;
export type ModerationConfig = z.infer<typeof moderationSchema>;
export type ResultsConfig = z.infer<typeof resultsSchema>;

/**
 * Parse and validate a YAML config file.
 * @param filePath Path to the YAML file.
 * @returns Parsed and validated EventConfig.
 * @throws ConfigValidationError if validation fails.
 */
export async function parseConfig(filePath: string): Promise<EventConfig> {
  const content = await readFile(filePath, "utf-8");
  const raw = yaml.load(content);
  const result = validateConfig(raw);
  if (!result.success) {
    throw new ConfigValidationError(result.errors ?? []);
  }
  return raw as EventConfig;
}

/**
 * Pure validation without file I/O.
 * @param raw Unknown object to validate.
 * @returns ValidationResult with success flag and errors if any.
 */
export function validateConfig(raw: unknown): ValidationResult {
  const parse = eventConfigSchema.safeParse(raw);
  if (parse.success) {
    return { success: true };
  }
  return {
    success: false,
    errors: parse.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}
