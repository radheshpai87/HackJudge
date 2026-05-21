import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireAuth } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  requireAuth(req);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
  const criteria = await prisma.criterion.findMany({
    where: { eventId: event.id }, include: { track: true }, orderBy: { name: "asc" },
  });
  return success(criteria.map((c) => ({
    id: c.id, name: c.name, maxScore: c.maxScore, weight: Number(c.weight),
    scoringType: c.scoringType, rubric: c.rubric, trackId: c.trackId, trackName: (c as any).track?.name ?? null,
  })));
}
