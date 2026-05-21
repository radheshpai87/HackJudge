import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireEventOwner } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { eventId } = await requireEventOwner(req, params.slug);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
  const [totalTeams, totalJudges, completedSubmissions, totalAssignments] = await Promise.all([
    prisma.team.count({ where: { eventId: event.id } }),
    prisma.judge.count({ where: { eventId: event.id } }),
    prisma.scoreSubmission.count({ where: { eventId: event.id } }),
    prisma.assignment.count({ where: { eventId: event.id } }),
  ]);
  return success({ status: "open", totalTeams, totalJudges, completedSubmissions, totalAssignments });
}
