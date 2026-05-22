import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireAuth, requireJudge } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string; teamId: string } }) {
  try {
    const user = requireAuth(req);
    requireJudge(user);
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

    const team = await prisma.team.findFirst({ where: { id: params.teamId, eventId: event.id } });
    if (!team) return apiError("TEAM_NOT_FOUND", "Team not found", null, 404);

    const [scores, submission] = await Promise.all([
      prisma.score.findMany({ where: { judgeId: user.id, teamId: params.teamId } }),
      prisma.scoreSubmission.findFirst({ where: { judgeId: user.id, teamId: params.teamId } }),
    ]);

    return success({
      scores: scores.map((s: any) => ({ criterionId: s.criterionId, value: s.value })),
      notes: (submission as any)?.notes ?? "",
      submitted: !!submission,
    });
  } catch (e: any) {
    if (e.name === "AuthError") return apiError(e.code, e.message, null, e.status);
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message || "Internal error", null, 500);
  }
}
