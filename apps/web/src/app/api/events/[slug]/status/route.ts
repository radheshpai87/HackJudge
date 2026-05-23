import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { success, apiError } from "@/lib/api-response";
import { AuthError } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
    
    const eventOid = new ObjectId(event.id);
    
    // Use aggregation pipeline to batch count all metrics in parallel
    const [teamResults, judgeResults, submissionResults, assignmentResults] = await Promise.all([
      prisma.team.aggregateRaw({
        pipeline: [
          { $match: { eventId: eventOid } },
          { $count: "count" },
        ],
      }),
      prisma.judge.aggregateRaw({
        pipeline: [
          { $match: { eventId: eventOid } },
          { $count: "count" },
        ],
      }),
      prisma.scoreSubmission.aggregateRaw({
        pipeline: [
          { $match: { eventId: eventOid } },
          { $count: "count" },
        ],
      }),
      prisma.assignment.aggregateRaw({
        pipeline: [
          { $match: { eventId: eventOid } },
          { $count: "count" },
        ],
      }),
    ]);
    
    const totalTeams = teamResults[0]?.count ?? 0;
    const totalJudges = judgeResults[0]?.count ?? 0;
    const completedSubmissions = submissionResults[0]?.count ?? 0;
    const totalAssignments = assignmentResults[0]?.count ?? 0;
    
    return success({ status: "open", totalTeams, totalJudges, completedSubmissions, totalAssignments });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Status endpoint error:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch event status", null, 500);
  }
}
