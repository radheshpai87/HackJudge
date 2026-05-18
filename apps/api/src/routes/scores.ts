import { Router } from "express";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { success, error } from "@hackjudge/shared";
import { requireAuth, requireJudge, AuthRequest, auditLog } from "../middleware.js";

const router = Router({ mergeParams: true });

router.put("/:slug/scores", requireAuth, requireJudge, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  // Check lock_results_after
  const config = event.configJson as any;
  const now = new Date();
  const lockAfter = config.moderation?.lock_results_after ? new Date(config.moderation.lock_results_after) : null;
  if (lockAfter && now > lockAfter) {
    res.status(403).json(error("JUDGING_LOCKED", "Scores are locked"));
    return;
  }

  const schema = z.object({
    teamId: z.string(),
    scores: z.array(z.object({ criterionId: z.string(), value: z.number() })),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid request", parse.error.format()));
    return;
  }

  const { teamId, scores } = parse.data;

  // Verify team exists and judge has access
  const team = await prisma.team.findFirst({ where: { eventId: event.id, id: teamId } });
  if (!team) {
    res.status(404).json(error("TEAM_NOT_FOUND", "Team not found"));
    return;
  }

  const allCriteria = await prisma.criterion.findMany({ where: { eventId: event.id } });
  const critMap = new Map(allCriteria.map((c) => [c.id, c]));

  // Validate rubric scores that are actually submitted (draft saves may be partial)
  for (const s of scores) {
    const crit = critMap.get(s.criterionId);
    if (!crit) {
      res.status(400).json(error("INVALID_CRITERION", `Unknown criterion: ${s.criterionId}`));
      return;
    }
    if (crit.scoringType === "rubric") {
      const rubric = (crit.rubric as any[]) ?? [];
      const validScores = rubric.map((r) => r.score);
      if (!validScores.includes(s.value)) {
        res.status(400).json(error("INVALID_RUBRIC_SCORE", `Score ${s.value} is not a valid rubric level for criterion '${crit.name}'`));
        return;
      }
    } else {
      if (s.value < 0 || s.value > crit.maxScore) {
        res.status(400).json(error("INVALID_SCORE", `Score ${s.value} out of range for criterion '${crit.name}' (max ${crit.maxScore})`));
        return;
      }
    }
  }

  // Upsert scores (MongoDB-compatible: findFirst + create/update)
  for (const s of scores) {
    const existing = await prisma.score.findFirst({
      where: { judgeId: req.user!.id, teamId, criterionId: s.criterionId },
    });
    if (existing) {
      await prisma.score.update({
        where: { id: existing.id },
        data: { value: s.value },
      });
    } else {
      await prisma.score.create({
        data: {
          eventId: event.id,
          judgeId: req.user!.id,
          teamId,
          criterionId: s.criterionId,
          value: s.value,
        },
      });
    }
  }

  // Emit real-time update
  const io = (req.app as any).get("io");
  if (io) {
    io.to(`event:${event.slug}:organizer`).emit("score:updated", { judgeId: req.user!.id, teamId });
  }

  await auditLog(event.id, req.user!.id, "judge", "scores_saved", { teamId, count: scores.length });
  res.json(success({ saved: scores.length }));
});

router.post("/:slug/scores/submit", requireAuth, requireJudge, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const schema = z.object({ teamId: z.string(), notes: z.string().optional() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid request"));
    return;
  }

  const { teamId, notes } = parse.data;
  const existingSub = await prisma.scoreSubmission.findFirst({
    where: { judgeId: req.user!.id, teamId },
  });
  if (existingSub) {
    await prisma.scoreSubmission.update({
      where: { id: existingSub.id },
      data: { completedAt: new Date(), ...(notes !== undefined ? { notes } : {}) } as any,
    });
  } else {
    await prisma.scoreSubmission.create({
      data: { judgeId: req.user!.id, teamId, eventId: event.id, ...(notes !== undefined ? { notes } : {}) } as any,
    });
  }

  const io = (req.app as any).get("io");
  if (io) {
    io.to(`event:${event.slug}:organizer`).emit("submission:completed", { judgeId: req.user!.id, teamId });
  }

  await auditLog(event.id, req.user!.id, "judge", "scores_submitted", { teamId });
  res.json(success({ submitted: true }));
});

/* ─── UPDATE NOTES ON EXISTING SUBMISSION ─── */
router.put("/:slug/scores/notes", requireAuth, requireJudge, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json(error("EVENT_NOT_FOUND", "Event not found")); return; }
  const schema = z.object({ teamId: z.string(), notes: z.string() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) { res.status(400).json(error("VALIDATION_ERROR", "Invalid request")); return; }
  const { teamId, notes } = parse.data;
  const submission = await prisma.scoreSubmission.findFirst({ where: { judgeId: req.user!.id, teamId } });
  if (!submission) { res.status(404).json(error("SUBMISSION_NOT_FOUND", "Submit scores first before saving notes")); return; }
  await prisma.scoreSubmission.update({ where: { id: submission.id }, data: { notes } as any });
  res.json(success({ updated: true }));
});

router.get("/:slug/scores", requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.role !== "organizer") {
    res.status(403).json(error("FORBIDDEN", "Organizer access required"));
    return;
  }
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const scores = await prisma.score.findMany({
    where: { team: { eventId: event.id } },
    include: { judge: true, team: true, criterion: true },
  });
  res.json(success(scores.map((s) => ({
    id: s.id,
    judge: s.judge.name,
    team: s.team.name,
    criterion: s.criterion.name,
    value: s.value,
    submittedAt: s.submittedAt,
  }))));
});

export default router;
