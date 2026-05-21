import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { requireEventOwner } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { user, eventId } = await requireEventOwner(req, params.slug);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

  const config = event.configJson as any;
  if (!config.moderation?.enabled) return success({ outliers: [], enabled: false });

  const scores = await prisma.score.findMany({
    where: { team: { eventId: event.id } },
    include: { judge: true, team: true, criterion: true },
  });

  const threshold = config.moderation.outlier_threshold ?? 1.5;
  const outliers: any[] = [];
  const byTeamCriterion = new Map<string, typeof scores>();

  for (const s of scores) {
    const key = `${s.teamId}-${s.criterionId}`;
    const arr = byTeamCriterion.get(key) ?? [];
    arr.push(s);
    byTeamCriterion.set(key, arr);
  }

  byTeamCriterion.forEach((critScores) => {
    const values = critScores.map((s) => Number(s.value));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return;
    for (const s of critScores) {
      const deviation = Math.abs(Number(s.value) - mean) / stdDev;
      if (deviation > threshold) {
        outliers.push({ scoreId: s.id, judge: s.judge.name, team: s.team.name, criterion: s.criterion.name, score: Number(s.value), mean: Math.round(mean * 100) / 100, deviation: Math.round(deviation * 100) / 100 });
      }
    }
  });

  return success({ outliers, enabled: true });
}

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const { user, eventId } = await requireEventOwner(req, params.slug);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

  const config = event.configJson as any;
  const lockAfter = config.moderation?.lock_results_after ? new Date(config.moderation.lock_results_after) : null;
  if (lockAfter && new Date() > lockAfter) return apiError("RESULTS_LOCKED", "Results are locked", null, 403);

  const body = await req.json();
  const schema = z.object({ scoreId: z.string(), newValue: z.number() });
  const parse = schema.safeParse(body);
  if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request");

  await prisma.score.update({ where: { id: parse.data.scoreId }, data: { value: parse.data.newValue } });
  return success({ overridden: true });
}
