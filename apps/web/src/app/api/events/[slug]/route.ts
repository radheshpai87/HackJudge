import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireEventOwner, AuthError } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
    return success({ ...(event.configJson as any), status: "open" });
  } catch (error) {
    console.error("Event route error:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch event", null, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { eventId } = await requireEventOwner(req, params.slug);

    // Delete all associated entities
    await prisma.auditLog.deleteMany({ where: { eventId } });
    await prisma.score.deleteMany({ where: { eventId } });
    await prisma.scoreSubmission.deleteMany({ where: { eventId } });
    await prisma.assignment.deleteMany({ where: { eventId } });

    const judges = await prisma.judge.findMany({ where: { eventId }, select: { id: true } });
    const judgeIds = judges.map((j: any) => j.id);
    if (judgeIds.length > 0) {
      await prisma.judgeTrack.deleteMany({ where: { judgeId: { in: judgeIds } } });
    }

    await prisma.judge.deleteMany({ where: { eventId } });
    await prisma.team.deleteMany({ where: { eventId } });
    await prisma.criterion.deleteMany({ where: { eventId } });
    await prisma.track.deleteMany({ where: { eventId } });

    // Finally, delete the event
    await prisma.event.delete({ where: { id: eventId } });

    return success({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Event DELETE endpoint error:", error);
    return apiError("INTERNAL_ERROR", "Failed to delete event", null, 500);
  }
}
