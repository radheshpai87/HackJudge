import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { success, error } from "@hackjudge/shared";
import { requireAuth, requireJudge, requireOrganizer, AuthRequest } from "../middleware.js";

const router = Router({ mergeParams: true });

router.get("/:slug/judges/me", requireAuth, requireJudge, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const judge = await prisma.judge.findFirst({
    where: { eventId: event.id, id: req.user!.id },
    include: {
      judgeTracks: { include: { track: true } },
      assignments: { include: { team: { include: { track: true } } } },
      scoreSubmissions: true,
    },
  });
  if (!judge) {
    res.status(404).json(error("JUDGE_NOT_FOUND", "Judge not found"));
    return;
  }

  const completedTeamIds = judge.scoreSubmissions.map((s) => s.teamId);

  // Build team list: use explicit assignments if any, else fall back to all track-relevant teams (free mode)
  let teamList: { id: string; name: string; track: string | null; trackId: string | null; tableNumber: string | null; members: string[] }[];

  if (judge.assignments.length > 0) {
    teamList = judge.assignments.map((a) => ({
      id: a.team.id,
      name: a.team.name,
      track: a.team.track?.name ?? null,
      trackId: a.team.trackId,
      tableNumber: a.team.tableNumber,
      members: a.team.members as string[],
    }));
  } else {
    // Free mode: show all teams matching judge's assigned tracks (or all teams if judge covers all tracks)
    const judgeTrackIds = judge.judgeTracks.map((jt) => jt.trackId);
    const allTeams = await prisma.team.findMany({
      where: {
        eventId: event.id,
        ...(judgeTrackIds.length > 0
          ? { OR: [{ trackId: null }, { trackId: { in: judgeTrackIds } }] }
          : {}),
      },
      include: { track: true },
      orderBy: { name: "asc" },
    });
    teamList = allTeams.map((t) => ({
      id: t.id,
      name: t.name,
      track: (t as any).track?.name ?? null,
      trackId: t.trackId,
      tableNumber: t.tableNumber,
      members: t.members as string[],
    }));
  }

  const totalAssigned = teamList.length;
  const completed = judge.scoreSubmissions.length;
  res.json(success({
    judge: { id: judge.id, name: judge.name, email: judge.email },
    tracks: judge.judgeTracks.map((jt) => jt.track.name),
    assignments: teamList,
    completedTeamIds,
    progress: { totalAssigned, completed, percent: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0 },
  }));
});

router.get("/:slug/judges", requireAuth, requireOrganizer, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const judges = await prisma.judge.findMany({
    where: { eventId: event.id },
    include: {
      judgeTracks: { include: { track: true } },
      scoreSubmissions: true,
      assignments: true,
    },
  });
  res.json(success(judges.map((j) => ({
    id: j.id,
    name: j.name,
    email: j.email,
    tracks: j.judgeTracks.map((jt) => jt.track.name),
    hasPin: !!j.passwordHash,
    completion: j.assignments.length > 0 ? Math.round((j.scoreSubmissions.length / j.assignments.length) * 100) : 0,
  }))));
});

router.put("/:slug/judges/:judgeId/pin", requireAuth, requireOrganizer, async (req: AuthRequest, res) => {
  const schema = z.object({ pin: z.string().min(4).max(12) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json(error("VALIDATION_ERROR", "PIN must be 4–12 characters"));
    return;
  }
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json(error("EVENT_NOT_FOUND", "Event not found")); return; }
  const judge = await prisma.judge.findFirst({ where: { id: req.params.judgeId, eventId: event.id } });
  if (!judge) { res.status(404).json(error("JUDGE_NOT_FOUND", "Judge not found")); return; }
  const hash = await bcrypt.hash(parse.data.pin, 10);
  await prisma.judge.update({ where: { id: judge.id }, data: { passwordHash: hash } });
  res.json(success({ updated: true }));
});

router.delete("/:slug/judges/:judgeId/pin", requireAuth, requireOrganizer, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json(error("EVENT_NOT_FOUND", "Event not found")); return; }
  await prisma.judge.updateMany({ where: { id: req.params.judgeId, eventId: event.id }, data: { passwordHash: null } });
  res.json(success({ cleared: true }));
});

router.get("/:slug/judges/my-scores/:teamId", requireAuth, requireJudge, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json(error("EVENT_NOT_FOUND", "Event not found")); return; }
  const team = await prisma.team.findFirst({ where: { id: req.params.teamId, eventId: event.id } });
  if (!team) { res.status(404).json(error("TEAM_NOT_FOUND", "Team not found")); return; }
  const [scores, submission] = await Promise.all([
    prisma.score.findMany({ where: { judgeId: req.user!.id, teamId: req.params.teamId } }),
    prisma.scoreSubmission.findFirst({ where: { judgeId: req.user!.id, teamId: req.params.teamId } }),
  ]);
  res.json(success({
    scores: scores.map((s) => ({ criterionId: s.criterionId, value: s.value })),
    notes: (submission as any)?.notes ?? '',
    submitted: !!submission,
  }));
});

router.get("/:slug/criteria", requireAuth, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const criteria = await prisma.criterion.findMany({
    where: { eventId: event.id },
    include: { track: true },
    orderBy: { name: "asc" },
  });
  res.json(success(criteria.map((c) => ({
    id: c.id,
    name: c.name,
    maxScore: c.maxScore,
    weight: Number(c.weight),
    scoringType: c.scoringType,
    rubric: c.rubric,
    trackId: c.trackId,
    trackName: (c as any).track?.name ?? null,
  }))));
});

export default router;
