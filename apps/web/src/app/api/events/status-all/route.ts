import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireAuth, requireOrganizer, AuthError } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    // Ensure DB connection is initialized
    await prisma.$connect?.();
    
    let user;
    try {
      user = requireAuth(req);
    } catch (authErr) {
      console.error("Auth error:", authErr);
      if (authErr instanceof AuthError) {
        return apiError(authErr.code, authErr.message, null, authErr.status);
      }
      return apiError("UNAUTHORIZED", "Authentication failed", null, 401);
    }

    try {
      requireOrganizer(user);
    } catch (roleErr) {
      console.error("Role check error:", roleErr);
      if (roleErr instanceof AuthError) {
        return apiError(roleErr.code, roleErr.message, null, roleErr.status);
      }
      return apiError("FORBIDDEN", "Organizer role required", null, 403);
    }

    let events;
    try {
      events = await prisma.event.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, slug: true, configJson: true, status: true, createdAt: true },
      });
    } catch (dbErr) {
      console.error("Error fetching events:", dbErr);
      return apiError("DATABASE_ERROR", "Failed to fetch events", null, 500);
    }

    if (!events || events.length === 0) {
      return success([]);
    }

    // Batch aggregation: get counts grouped by eventId to avoid N+4 queries
    const eventIds = events.map(e => new ObjectId(e.id));
    
    let teamCounts: Record<string, number> = {};
    let judgeCounts: Record<string, number> = {};
    let submissionCounts: Record<string, number> = {};
    let assignmentCounts: Record<string, number> = {};

    try {
      // Batch count teams by eventId
      const teamResults = await prisma.team.aggregateRaw({
        pipeline: [
          { $match: { eventId: { $in: eventIds } } },
          { $group: { _id: "$eventId", count: { $sum: 1 } } },
        ],
      });
      teamResults.forEach((r: any) => {
        teamCounts[r._id.toString()] = r.count;
      });

      // Batch count judges by eventId
      const judgeResults = await prisma.judge.aggregateRaw({
        pipeline: [
          { $match: { eventId: { $in: eventIds } } },
          { $group: { _id: "$eventId", count: { $sum: 1 } } },
        ],
      });
      judgeResults.forEach((r: any) => {
        judgeCounts[r._id.toString()] = r.count;
      });

      // Batch count submissions by eventId
      const submissionResults = await prisma.scoreSubmission.aggregateRaw({
        pipeline: [
          { $match: { eventId: { $in: eventIds } } },
          { $group: { _id: "$eventId", count: { $sum: 1 } } },
        ],
      });
      submissionResults.forEach((r: any) => {
        submissionCounts[r._id.toString()] = r.count;
      });

      // Batch count assignments by eventId
      const assignmentResults = await prisma.assignment.aggregateRaw({
        pipeline: [
          { $match: { eventId: { $in: eventIds } } },
          { $group: { _id: "$eventId", count: { $sum: 1 } } },
        ],
      });
      assignmentResults.forEach((r: any) => {
        assignmentCounts[r._id.toString()] = r.count;
      });
    } catch (aggError) {
      console.error("Aggregation error:", aggError);
      // Fallback to empty counts
    }

    // Build response using pre-aggregated counts
    const list = events.map((e: any) => {
      const cfg = e.configJson as any;
      return {
        slug: e.slug,
        name: cfg?.event?.name ?? e.slug,
        status: "open",
        teams: teamCounts[e.id] ?? 0,
        judges: judgeCounts[e.id] ?? 0,
        completedSubmissions: submissionCounts[e.id] ?? 0,
        totalAssignments: assignmentCounts[e.id] ?? 0,
        createdAt: e.createdAt,
      };
    });
    
    return success(list);
  } catch (error) {
    console.error("Status-all endpoint error:", error instanceof Error ? { message: error.message, stack: error.stack } : error);
    return apiError("INTERNAL_ERROR", "Failed to fetch event statuses", null, 500);
  }
}
