import { Router } from "express";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { success, error } from "@hackjudge/shared";
import { requireAuth, requireOrganizer, AuthRequest } from "../middleware.js";

const router = Router({ mergeParams: true });

router.get("/:slug/moderation/outliers", requireAuth, requireOrganizer, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const config = event.configJson as any;
  if (!config.moderation?.enabled) {
    res.json(success({ outliers: [], enabled: false }));
    return;
  }

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

  for (const [, critScores] of byTeamCriterion.entries()) {
    const values = critScores.map((s) => Number(s.value));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) continue;
    for (const s of critScores) {
      const deviation = Math.abs(Number(s.value) - mean) / stdDev;
      if (deviation > threshold) {
        outliers.push({
          scoreId: s.id,
          judge: s.judge.name,
          team: s.team.name,
          criterion: s.criterion.name,
          score: Number(s.value),
          mean: Math.round(mean * 100) / 100,
          deviation: Math.round(deviation * 100) / 100,
        });
      }
    }
  }

  res.json(success({ outliers, enabled: true }));
});

router.put("/:slug/moderation/override", requireAuth, requireOrganizer, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const config = event.configJson as any;
  const lockAfter = config.moderation?.lock_results_after ? new Date(config.moderation.lock_results_after) : null;
  if (lockAfter && new Date() > lockAfter) {
    res.status(403).json(error("RESULTS_LOCKED", "Results are locked"));
    return;
  }

  const schema = z.object({ scoreId: z.string(), newValue: z.number() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid request"));
    return;
  }

  await prisma.score.update({
    where: { id: parse.data.scoreId },
    data: { value: parse.data.newValue },
  });

  res.json(success({ overridden: true }));
});

export default router;
