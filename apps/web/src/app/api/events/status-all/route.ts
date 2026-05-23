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
    const list = await Promise.all(events.map(async (e: any) => {
      const cfg = e.configJson as any;
      const [teams, judges, submissions, assignments] = await Promise.all([
        prisma.team.count({ where: { eventId: e.id } }),
        prisma.judge.count({ where: { eventId: e.id } }),
        prisma.scoreSubmission.count({ where: { eventId: e.id } }),
        prisma.assignment.count({ where: { team: { eventId: e.id } } }),
      ]);
      return { slug: e.slug, name: cfg?.event?.name ?? e.slug, status: "open", teams, judges, completedSubmissions: submissions, totalAssignments: assignments, createdAt: e.createdAt };
    }));
    return success(list);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Status-all endpoint error:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch event statuses", null, 500);
  }
}
