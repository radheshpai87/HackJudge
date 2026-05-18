import { Router } from "express";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { parseConfig, ConfigValidationError } from "@hackjudge/config-engine";
import { success, error } from "@hackjudge/shared";
import { requireAuth, requireOrganizer, AuthRequest, auditLog } from "../middleware.js";

const router = Router();

function getJudgingStatus(opens: string, closes: string) {
  const now = new Date();
  const openTime = new Date(opens);
  const closeTime = new Date(closes);
  if (now < openTime) return { status: "not_started", opensIn: openTime.getTime() - now.getTime() };
  if (now > closeTime) return { status: "closed", closedAt: closeTime.toISOString() };
  return { status: "open", closesIn: closeTime.getTime() - now.getTime() };
}

router.post("/", requireAuth, requireOrganizer, async (req: AuthRequest, res) => {
  const schema = z.object({ configYaml: z.string() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid request", parse.error.format()));
    return;
  }

  // Write temp file for parseConfig
  const fs = await import("fs/promises");
  const os = await import("os");
  const path = await import("path");
  const tmpFile = path.join(os.tmpdir(), `event-${Date.now()}.yaml`);
  await fs.writeFile(tmpFile, parse.data.configYaml, "utf-8");

  let config;
  try {
    config = await parseConfig(tmpFile);
  } catch (e) {
    await fs.unlink(tmpFile).catch(() => {});
    if (e instanceof ConfigValidationError) {
      res.status(400).json(error("CONFIG_VALIDATION_ERROR", "Invalid config", e.errors));
      return;
    }
    throw e;
  }
  await fs.unlink(tmpFile).catch(() => {});

  // Check slug collision
  const existing = await prisma.event.findUnique({ where: { slug: config.event.slug } });
  if (existing) {
    res.status(409).json(error("SLUG_COLLISION", `An event with slug '${config.event.slug}' already exists`));
    return;
  }

  // Validate: duplicate team names
  const teamNames = config.teams.map((t: any) => t.name);
  const dupTeams = teamNames.filter((item: string, index: number) => teamNames.indexOf(item) !== index);
  if (dupTeams.length > 0) {
    res.status(400).json(error("CONFIG_VALIDATION_ERROR", `Duplicate team names: ${[...new Set(dupTeams)].join(", ")}`));
    return;
  }

  // Validate: duplicate judge emails
  const judgeEmails = config.judges.map((j: any) => j.email);
  const dupJudges = judgeEmails.filter((item: string, index: number) => judgeEmails.indexOf(item) !== index);
  if (dupJudges.length > 0) {
    res.status(400).json(error("CONFIG_VALIDATION_ERROR", `Duplicate judge emails: ${[...new Set(dupJudges)].join(", ")}`));
    return;
  }

  // Validate: track references exist
  const trackIds = new Set(config.tracks.map((t: any) => t.id));
  for (const t of config.teams) {
    if (t.track_id && !trackIds.has(t.track_id)) {
      res.status(400).json(error("CONFIG_VALIDATION_ERROR", `Team '${t.name}' references unknown track '${t.track_id}'`));
      return;
    }
  }
  for (const c of config.criteria) {
    if (c.track_id && !trackIds.has(c.track_id)) {
      res.status(400).json(error("CONFIG_VALIDATION_ERROR", `Criterion '${c.name}' references unknown track '${c.track_id}'`));
      return;
    }
  }

  const event = await prisma.event.create({
    data: {
      slug: config.event.slug,
      configJson: config as unknown as any,
      configHash: "hash",
      status: "active",
    },
  });

  // Create tracks, criteria, teams, judges
  const trackMap = new Map<string, string>();
  for (const t of config.tracks) {
    const created = await prisma.track.create({
      data: { eventId: event.id, name: t.name, description: t.description },
    });
    trackMap.set(t.id, created.id);
  }

  for (const c of config.criteria) {
    await prisma.criterion.create({
      data: {
        eventId: event.id,
        trackId: c.track_id ? trackMap.get(c.track_id) : null,
        name: c.name,
        weight: c.weight,
        maxScore: c.max_score,
        scoringType: c.scoring_type,
        rubric: c.rubric as any,
      },
    });
  }

  for (const t of config.teams) {
    await prisma.team.create({
      data: {
        eventId: event.id,
        name: t.name,
        trackId: t.track_id ? trackMap.get(t.track_id) : null,
        tableNumber: t.table_number,
        members: t.members ?? [],
      },
    });
  }

  for (const j of config.judges) {
    const created = await prisma.judge.create({
      data: { eventId: event.id, name: j.name, email: j.email },
    });
    if (Array.isArray(j.tracks)) {
      for (const tid of j.tracks) {
        if (tid === 'all') continue;
        const resolvedTrackId = trackMap.get(tid);
        if (!resolvedTrackId) continue;
        await prisma.judgeTrack.create({
          data: { judgeId: created.id, trackId: resolvedTrackId },
        });
      }
    }
  }

  if (config.assignment.mode !== "free" && config.assignment.assigned_teams) {
    for (const a of config.assignment.assigned_teams) {
      const judge = await prisma.judge.findFirst({ where: { eventId: event.id, name: a.judge_id } });
      if (!judge) continue;
      for (const tid of a.team_ids) {
        const team = await prisma.team.findFirst({ where: { eventId: event.id, name: tid } });
        if (!team) continue;
        await prisma.assignment.create({
          data: { judgeId: judge.id, teamId: team.id, eventId: event.id },
        });
      }
    }
  }

  await auditLog(event.id, req.user!.id, "organizer", "event_created", { slug: event.slug, teams: config.teams.length, judges: config.judges.length });
  res.status(201).json(success({ slug: event.slug, id: event.id }));
});

router.get("/status-all", requireAuth, requireOrganizer, async (_req: AuthRequest, res) => {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, slug: true, configJson: true, status: true, createdAt: true },
  });
  const list = await Promise.all(events.map(async (e) => {
    const cfg = e.configJson as any;
    const { status } = getJudgingStatus(cfg.event?.judging_opens_at, cfg.event?.judging_closes_at);
    const [teams, judges, submissions, assignments] = await Promise.all([
      prisma.team.count({ where: { eventId: e.id } }),
      prisma.judge.count({ where: { eventId: e.id } }),
      prisma.scoreSubmission.count({ where: { eventId: e.id } }),
      prisma.assignment.count({ where: { team: { eventId: e.id } } }),
    ]);
    return {
      slug: e.slug,
      name: cfg?.event?.name ?? e.slug,
      status,
      teams,
      judges,
      completedSubmissions: submissions,
      totalAssignments: assignments,
      createdAt: e.createdAt,
    };
  }));
  res.json(success(list));
});

router.get("/", async (_req, res) => {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, slug: true, configJson: true, status: true, createdAt: true },
  });
  const list = events.map((e) => {
    const cfg = e.configJson as any;
    return {
      slug: e.slug,
      name: cfg?.event?.name ?? e.slug,
      status: e.status,
      tracks: cfg?.tracks?.length ?? 0,
      teams: cfg?.teams?.length ?? 0,
      judges: cfg?.judges?.length ?? 0,
      createdAt: e.createdAt,
    };
  });
  res.json(success(list));
});

router.get("/:slug", async (req, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const config = event.configJson as any;
  const { status, opensIn, closesIn } = getJudgingStatus(config.event.judging_opens_at, config.event.judging_closes_at);
  res.json(success({ ...config, status, opensIn, closesIn }));
});

router.patch("/:slug/config", requireAuth, requireOrganizer, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json(error("EVENT_NOT_FOUND", "Event not found")); return; }
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    timezone: z.string().optional(),
    judging_opens_at: z.string().optional(),
    judging_closes_at: z.string().optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) { res.status(400).json(error("VALIDATION_ERROR", "Invalid request")); return; }
  const config = event.configJson as any;
  const updatedConfig = { ...config, event: { ...config.event, ...parse.data } };
  await prisma.event.update({ where: { slug: req.params.slug }, data: { configJson: updatedConfig } });
  await auditLog(event.id, req.user!.id, "organizer", "event_config_updated", parse.data);
  res.json(success({ updated: true }));
});

router.get("/:slug/status", async (req, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const config = event.configJson as any;
  const { status } = getJudgingStatus(config.event.judging_opens_at, config.event.judging_closes_at);

  const totalTeams = await prisma.team.count({ where: { eventId: event.id } });
  const totalJudges = await prisma.judge.count({ where: { eventId: event.id } });
  const completedSubmissions = await prisma.scoreSubmission.count({ where: { eventId: event.id } });
  const totalAssignments = await prisma.assignment.count({ where: { eventId: event.id } });

  res.json(success({
    status,
    totalTeams,
    totalJudges,
    completedSubmissions,
    totalAssignments,
  }));
});

export default router;
