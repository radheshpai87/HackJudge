import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireAuth, requireOrganizer, AuthError } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
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

    const list = await Promise.all(
      events.map(async (e: any) => {
        try {
          const cfg = e.configJson as any;
          
          // Count with individual try-catch to prevent one failure from blocking all
          let teams = 0, judges = 0, submissions = 0, assignments = 0;
          
          try {
            teams = await prisma.team.count({ where: { eventId: e.id } });
          } catch (err) {
            console.warn(`Failed to count teams for event ${e.id}:`, err);
          }
          
          try {
            judges = await prisma.judge.count({ where: { eventId: e.id } });
          } catch (err) {
            console.warn(`Failed to count judges for event ${e.id}:`, err);
          }
          
          try {
            submissions = await prisma.scoreSubmission.count({ where: { eventId: e.id } });
          } catch (err) {
            console.warn(`Failed to count submissions for event ${e.id}:`, err);
          }
          
          try {
            // Count assignments without complex nested query - just count by eventId
            assignments = await prisma.assignment.count({ where: { eventId: e.id } });
          } catch (err) {
            console.warn(`Failed to count assignments for event ${e.id}:`, err);
          }
          
          return { 
            slug: e.slug, 
            name: cfg?.event?.name ?? e.slug, 
            status: "open", 
            teams, 
            judges, 
            completedSubmissions: submissions, 
            totalAssignments: assignments, 
            createdAt: e.createdAt 
          };
        } catch (eventError) {
          console.error(`Error processing event ${e.id}:`, eventError);
          // Return minimal data instead of failing entire request
          const cfg = e.configJson as any;
          return { 
            slug: e.slug, 
            name: cfg?.event?.name ?? e.slug, 
            status: "open", 
            teams: 0, 
            judges: 0, 
            completedSubmissions: 0, 
            totalAssignments: 0, 
            createdAt: e.createdAt,
            error: "Failed to fetch counts"
          };
        }
      })
    );
    
    return success(list);
  } catch (error) {
    console.error("Status-all endpoint error:", error instanceof Error ? { message: error.message, stack: error.stack } : error);
    return apiError("INTERNAL_ERROR", "Failed to fetch event statuses", null, 500);
  }
}
