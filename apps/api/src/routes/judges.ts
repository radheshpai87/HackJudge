import { Router } from "express";
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

  const totalAssigned = judge.assignments.length;
  const completed = judge.scoreSubmissions.length;
  const completedTeamIds = judge.scoreSubmissions.map((s) => s.teamId);
  res.json(success({
    judge: { id: judge.id, name: judge.name, email: judge.email },
    tracks: judge.judgeTracks.map((jt) => jt.track.name),
    assignments: judge.assignments.map((a) => ({
      id: a.team.id,
      name: a.team.name,
      track: a.team.track?.name ?? null,
      trackId: a.team.trackId,
      tableNumber: a.team.tableNumber,
      members: a.team.members,
    })),
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
    completion: j.assignments.length > 0 ? Math.round((j.scoreSubmissions.length / j.assignments.length) * 100) : 0,
  }))));
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
