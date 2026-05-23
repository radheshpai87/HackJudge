import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string; teamId: string } }) {
  try {
    const user = requireAuth(req);
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
    const team = await prisma.team.findFirst({ where: { eventId: event.id, id: params.teamId }, include: { track: true } });
    if (!team) return apiError("TEAM_NOT_FOUND", "Team not found", null, 404);

    const existingScores = user.role === "judge"
      ? await prisma.score.findMany({ where: { judgeId: user.id, teamId: team.id }, include: { criterion: true } })
      : [];

    return success({
      id: team.id, name: team.name, track: team.track?.name ?? null, tableNumber: team.tableNumber, members: team.members,
      scores: existingScores.map((s: any) => ({ criterionId: s.criterionId, criterionName: s.criterion.name, value: s.value })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Team detail endpoint error:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch team details", null, 500);
  }
}
