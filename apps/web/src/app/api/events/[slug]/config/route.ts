import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { requireEventOwner } from "@/lib/auth";
import { auditLog } from "@/lib/audit-log";
import { success, apiError } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const { user, eventId } = await requireEventOwner(req, params.slug);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

  const body = await req.json();
  const hasStructural = body.tracks !== undefined || body.teams !== undefined || body.judges !== undefined || body.criteria !== undefined;

  if (hasStructural) {
    const trackSchema = z.object({ id: z.string(), name: z.string().min(1), description: z.string().default("") });
    const criterionSchema = z.object({ id: z.string(), name: z.string().min(1), weight: z.number().min(0).max(1), max_score: z.number().int().min(1), track_id: z.string().nullable().optional(), scoring_type: z.string().default("numeric") });
    const teamSchema = z.object({ id: z.string(), name: z.string().min(1), track_id: z.string().nullable().optional(), table_number: z.string().default("") });
    const judgeSchema = z.object({ id: z.string(), name: z.string().min(1), email: z.string().email(), tracks: z.array(z.string()).default([]) });
    const schema = z.object({ name: z.string().min(1).optional(), description: z.string().optional(), timezone: z.string().optional(), tracks: z.array(trackSchema).optional(), criteria: z.array(criterionSchema).optional(), teams: z.array(teamSchema).optional(), judges: z.array(judgeSchema).optional() });
    const parse = schema.safeParse(body);
    if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request", parse.error.format());
    const d = parse.data;
    const cfg = event.configJson as any;

    await prisma.score.deleteMany({ where: { eventId: event.id } });
    await prisma.scoreSubmission.deleteMany({ where: { eventId: event.id } });
    await prisma.assignment.deleteMany({ where: { eventId: event.id } });
    const jids = (await prisma.judge.findMany({ where: { eventId: event.id }, select: { id: true } })).map((j: { id: string }) => j.id);
    if (jids.length > 0) await prisma.judgeTrack.deleteMany({ where: { judgeId: { in: jids } } });
    await prisma.judge.deleteMany({ where: { eventId: event.id } });
    await prisma.team.deleteMany({ where: { eventId: event.id } });
    await prisma.criterion.deleteMany({ where: { eventId: event.id } });
    await prisma.track.deleteMany({ where: { eventId: event.id } });

    const trackMap = new Map<string, string>();
    for (const t of d.tracks ?? []) { const c = await prisma.track.create({ data: { eventId: event.id, name: t.name, description: t.description } }); trackMap.set(t.id, c.id); }
    for (const c of d.criteria ?? []) { await prisma.criterion.create({ data: { eventId: event.id, name: c.name, weight: c.weight, maxScore: c.max_score, scoringType: c.scoring_type, rubric: null, trackId: c.track_id ? (trackMap.get(c.track_id) ?? null) : null } }); }
    for (const t of d.teams ?? []) { await prisma.team.create({ data: { eventId: event.id, name: t.name, tableNumber: t.table_number, members: [], trackId: t.track_id ? (trackMap.get(t.track_id) ?? null) : null } }); }
    for (const j of d.judges ?? []) { const cj = await prisma.judge.create({ data: { eventId: event.id, name: j.name, email: j.email } }); for (const tid of j.tracks) { if (tid === "all") continue; const r = trackMap.get(tid); if (r) await prisma.judgeTrack.create({ data: { judgeId: cj.id, trackId: r } }); } }

    const uc = { ...cfg, event: { ...cfg.event, ...(d.name ? { name: d.name } : {}), ...(d.description !== undefined ? { description: d.description } : {}), ...(d.timezone ? { timezone: d.timezone } : {}) }, tracks: d.tracks ?? cfg.tracks, criteria: d.criteria ?? cfg.criteria, teams: d.teams ?? cfg.teams, judges: d.judges ?? cfg.judges };
    await prisma.event.update({ where: { slug: params.slug }, data: { configJson: uc } });
    await auditLog(event.id, user.id, "organizer", "event_structural_update", { slug: event.slug });
    return success({ updated: true, structural: true });
  }

  const schema = z.object({ name: z.string().min(1).optional(), description: z.string().optional(), timezone: z.string().optional() });
  const parse = schema.safeParse(body);
  if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request");
  const cfg = event.configJson as any;
  const uc = { ...cfg, event: { ...cfg.event, ...parse.data } };
  await prisma.event.update({ where: { slug: params.slug }, data: { configJson: uc } });
  await auditLog(event.id, user.id, "organizer", "event_config_updated", parse.data);
  return success({ updated: true });
}
