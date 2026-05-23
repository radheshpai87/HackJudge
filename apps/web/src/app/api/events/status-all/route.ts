import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireAuth, requireOrganizer, AuthError } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    requireOrganizer(user);

    const events = await prisma.event.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, configJson: true, status: true, createdAt: true },
    });

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
            assignments = await prisma.assignment.count({ where: { team: { eventId: e.id } } });
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
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Status-all endpoint error:", error instanceof Error ? { message: error.message, stack: error.stack } : error);
    return apiError("INTERNAL_ERROR", "Failed to fetch event statuses", null, 500);
  }
}
