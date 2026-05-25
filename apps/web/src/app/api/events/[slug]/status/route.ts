import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { success, apiError } from "@/lib/api-response";
import { AuthError } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
    
    // Parallel count queries with graceful fallback
    const countPromises = [
      prisma.team.count({ where: { eventId: event.id } }).catch(() => 0),
      prisma.judge.count({ where: { eventId: event.id } }).catch(() => 0),
      prisma.scoreSubmission.count({ where: { eventId: event.id } }).catch(() => 0),
      prisma.assignment.count({ where: { eventId: event.id } }).catch(() => 0),
    ];
    
    const [totalTeams, totalJudges, completedSubmissions, assignmentsCount] = await Promise.all(countPromises);
    
    let totalAssignments = assignmentsCount;
    if (assignmentsCount === 0 && totalJudges > 0 && totalTeams > 0) {
      const [judges, teams] = await Promise.all([
        prisma.judge.findMany({ where: { eventId: event.id }, include: { judgeTracks: true } }),
        prisma.team.findMany({ where: { eventId: event.id }, select: { trackId: true } }),
      ]);
      
      let sum = 0;
      for (const j of judges) {
        const judgeTrackIds = j.judgeTracks.map((jt: any) => jt.trackId);
        const targetTeams = teams.filter((t: any) => {
          if (judgeTrackIds.length === 0) return true;
          return t.trackId === null || judgeTrackIds.includes(t.trackId);
        });
        sum += targetTeams.length;
      }
      totalAssignments = sum;
    }
    
    return success({ status: "open", totalTeams, totalJudges, completedSubmissions, totalAssignments });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Status endpoint error:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch event status", null, 500);
  }
}
