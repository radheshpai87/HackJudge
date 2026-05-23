import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireAuth, requireOrganizer, AuthError } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

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

    // Fetch counts in parallel with graceful degradation
    const countQueries = Promise.all(
      events.map(async (e: any) => {
        try {
          const counts = await Promise.all([
            prisma.team.count({ where: { eventId: e.id } }).catch(() => 0),
            prisma.judge.count({ where: { eventId: e.id } }).catch(() => 0),
            prisma.scoreSubmission.count({ where: { eventId: e.id } }).catch(() => 0),
            prisma.assignment.count({ where: { eventId: e.id } }).catch(() => 0),
          ]);
          return { eventId: e.id, counts };
        } catch (err) {
          console.warn(`Failed to fetch counts for event ${e.id}:`, err);
          return { eventId: e.id, counts: [0, 0, 0, 0] };
        }
      })
    );

    let eventCounts: Record<string, number[]> = {};
    try {
      const results = await countQueries;
      results.forEach((r: any) => {
        eventCounts[r.eventId] = r.counts;
      });
    } catch (err) {
      console.error("Error fetching event counts:", err);
      // Continue with zero counts
      events.forEach((e: any) => {
        eventCounts[e.id] = [0, 0, 0, 0];
      });
    }

    // Build response
    const list = events.map((e: any) => {
      const cfg = e.configJson as any;
      const [teams, judges, submissions, assignments] = eventCounts[e.id] || [0, 0, 0, 0];
      return {
        slug: e.slug,
        name: cfg?.event?.name ?? e.slug,
        status: "open",
        teams,
        judges,
        completedSubmissions: submissions,
        totalAssignments: assignments,
        createdAt: e.createdAt,
      };
    });

    return success(list);
  } catch (error) {
    console.error("Status-all endpoint error:", error instanceof Error ? { message: error.message, stack: error.stack } : error);
    return apiError("INTERNAL_ERROR", "Failed to fetch event statuses", null, 500);
  }
}
