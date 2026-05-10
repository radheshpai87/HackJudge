import { Router } from "express";
import { prisma } from "@hackjudge/db";
import { success, error } from "@hackjudge/shared";
import { requireAuth, AuthRequest } from "../middleware.js";

const router = Router({ mergeParams: true });

router.get("/:slug/teams", requireAuth, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }

  let where: any = { eventId: event.id };
  if (req.user!.role === "judge" && req.user!.eventId === event.id) {
    const judgeTracks = await prisma.judgeTrack.findMany({
      where: { judgeId: req.user!.id },
      select: { trackId: true },
    });
    const trackIds = judgeTracks.map((jt) => jt.trackId);
    if (trackIds.length > 0) {
      where = { eventId: event.id, OR: [{ trackId: { in: trackIds } }, { trackId: null }] };
    }
  }

  const teams = await prisma.team.findMany({
    where,
    include: { track: true },
  });
  res.json(success(teams.map((t) => ({
    id: t.id,
    name: t.name,
    track: t.track?.name ?? null,
    tableNumber: t.tableNumber,
    members: t.members,
  }))));
});

router.get("/:slug/teams/:teamId", requireAuth, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const team = await prisma.team.findFirst({
    where: { eventId: event.id, id: req.params.teamId },
    include: { track: true },
  });
  if (!team) {
    res.status(404).json(error("TEAM_NOT_FOUND", "Team not found"));
    return;
  }

  const existingScores = req.user!.role === "judge"
    ? await prisma.score.findMany({
        where: { judgeId: req.user!.id, teamId: team.id },
        include: { criterion: true },
      })
    : [];

  res.json(success({
    id: team.id,
    name: team.name,
    track: team.track?.name ?? null,
    tableNumber: team.tableNumber,
    members: team.members,
    scores: existingScores.map((s) => ({
      criterionId: s.criterionId,
      criterionName: s.criterion.name,
      value: s.value,
    })),
  }));
});

export default router;
