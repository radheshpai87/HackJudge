import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { requireAuth, requireJudge, requireEventOwner } from "@/lib/auth";
import { auditLog } from "@/lib/audit-log";
import { success, apiError } from "@/lib/api-response";

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const user = requireAuth(req);
  requireJudge(user);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

  const config = event.configJson as any;
  const lockAfter = config.moderation?.lock_results_after ? new Date(config.moderation.lock_results_after) : null;
  if (lockAfter && new Date() > lockAfter) return apiError("JUDGING_LOCKED", "Scores are locked", null, 403);

  const body = await req.json();
  const schema = z.object({ teamId: z.string(), scores: z.array(z.object({ criterionId: z.string(), value: z.number() })) });
  const parse = schema.safeParse(body);
  if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request", parse.error.format());

  const { teamId, scores } = parse.data;
  const team = await prisma.team.findFirst({ where: { eventId: event.id, id: teamId } });
  if (!team) return apiError("TEAM_NOT_FOUND", "Team not found", null, 404);

  const allCriteria = await prisma.criterion.findMany({ where: { eventId: event.id } });
  const critMap = new Map(allCriteria.map((c) => [c.id, c]));

  for (const s of scores) {
    const crit = critMap.get(s.criterionId);
    if (!crit) return apiError("INVALID_CRITERION", `Unknown criterion: ${s.criterionId}`);
    if (crit.scoringType === "rubric") {
      const rubric = (crit.rubric as any[]) ?? [];
      if (!rubric.map((r) => r.score).includes(s.value)) return apiError("INVALID_RUBRIC_SCORE", `Score ${s.value} is not valid for '${crit.name}'`);
    } else {
      if (s.value < 0 || s.value > crit.maxScore) return apiError("INVALID_SCORE", `Score ${s.value} out of range for '${crit.name}'`);
    }
  }

  for (const s of scores) {
    const existing = await prisma.score.findFirst({ where: { judgeId: user.id, teamId, criterionId: s.criterionId } });
    if (existing) await prisma.score.update({ where: { id: existing.id }, data: { value: s.value } });
    else await prisma.score.create({ data: { eventId: event.id, judgeId: user.id, teamId, criterionId: s.criterionId, value: s.value } });
  }

  await auditLog(event.id, user.id, "judge", "scores_saved", { teamId, count: scores.length });
  return success({ saved: scores.length });
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { eventId } = await requireEventOwner(req, params.slug);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
  const scores = await prisma.score.findMany({
    where: { team: { eventId: event.id } },
    include: { judge: true, team: true, criterion: true },
  });
  return success(scores.map((s) => ({ id: s.id, judge: s.judge.name, team: s.team.name, criterion: s.criterion.name, value: s.value, submittedAt: s.submittedAt })));
}

