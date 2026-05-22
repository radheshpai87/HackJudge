import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { parseConfigFromString, ConfigValidationError } from "@hackjudge/config-engine";
import { requireAuth, requireOrganizer } from "@/lib/auth";
import { auditLog } from "@/lib/audit-log";
import { success, apiError } from "@/lib/api-response";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  requireOrganizer(user);

  const events = await prisma.event.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, configJson: true, status: true, createdAt: true },
  });
  const list = events.map((e: any) => {
    const cfg = e.configJson as any;
    return { slug: e.slug, name: cfg?.event?.name ?? e.slug, status: e.status, tracks: cfg?.tracks?.length ?? 0, teams: cfg?.teams?.length ?? 0, judges: cfg?.judges?.length ?? 0, createdAt: e.createdAt };
  });
  return success(list);
}

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  requireOrganizer(user);

  const body = await req.json();
  const schema = z.object({ configYaml: z.string() });
  const parse = schema.safeParse(body);
  if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request", parse.error.format());

  let config;
  try { config = parseConfigFromString(parse.data.configYaml); }
  catch (e) { if (e instanceof ConfigValidationError) return apiError("CONFIG_VALIDATION_ERROR", "Invalid config", e.errors); throw e; }

  const existing = await prisma.event.findUnique({ where: { slug: config.event.slug } });
  if (existing) return apiError("SLUG_COLLISION", `Slug '${config.event.slug}' already exists`, null, 409);

  const event = await prisma.event.create({
    data: { slug: config.event.slug, userId: user.id, configJson: config as any, configHash: "hash", status: "active" },
  });

  const trackMap = new Map<string, string>();
  for (const t of config.tracks) {
    const created = await prisma.track.create({ data: { eventId: event.id, name: t.name, description: t.description } });
    trackMap.set(t.id, created.id);
  }
  for (const c of config.criteria) {
    await prisma.criterion.create({ data: { eventId: event.id, trackId: c.track_id ? trackMap.get(c.track_id) : null, name: c.name, weight: c.weight, maxScore: c.max_score, scoringType: c.scoring_type, rubric: c.rubric as any } });
  }
  for (const t of config.teams) {
    await prisma.team.create({ data: { eventId: event.id, name: t.name, trackId: t.track_id ? trackMap.get(t.track_id) : null, tableNumber: t.table_number, members: t.members ?? [] } });
  }
  for (const j of config.judges) {
    const created = await prisma.judge.create({ data: { eventId: event.id, name: j.name, email: j.email } });
    if (Array.isArray(j.tracks)) {
      for (const tid of j.tracks) { if (tid === "all") continue; const r = trackMap.get(tid); if (r) await prisma.judgeTrack.create({ data: { judgeId: created.id, trackId: r } }); }
    }
  }
  if (config.assignment.mode !== "free" && config.assignment.assigned_teams) {
    for (const a of config.assignment.assigned_teams) {
      const judge = await prisma.judge.findFirst({ where: { eventId: event.id, name: a.judge_id } });
      if (!judge) continue;
      for (const tid of a.team_ids) {
        const team = await prisma.team.findFirst({ where: { eventId: event.id, name: tid } });
        if (!team) continue;
        await prisma.assignment.create({ data: { judgeId: judge.id, teamId: team.id, eventId: event.id } });
      }
    }
  }

  await auditLog(event.id, user.id, "organizer", "event_created", { slug: event.slug, teams: config.teams.length, judges: config.judges.length });
  return success({ slug: event.slug, id: event.id }, 201);
}
