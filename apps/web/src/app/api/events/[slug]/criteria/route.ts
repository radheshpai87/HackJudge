import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireAuth, AuthError } from "@/lib/auth";

export const dynamic = 'force-dynamic';
import { success, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    requireAuth(req);
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
    const criteria = await prisma.criterion.findMany({
      where: { eventId: event.id }, include: { track: true }, orderBy: { name: "asc" },
    });
    return success(criteria.map((c: any) => ({
      id: c.id, name: c.name, maxScore: c.maxScore, weight: Number(c.weight),
      scoringType: c.scoringType, rubric: c.rubric, trackId: c.trackId, trackName: (c as any).track?.name ?? null,
    })));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Criteria endpoint error:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch criteria", null, 500);
  }
}
