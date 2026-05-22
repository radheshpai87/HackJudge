import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireAuth } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const user = requireAuth(req);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

  let where: any = { eventId: event.id };
  if (user.role === "judge" && user.eventId === event.id) {
    const judgeTracks = await prisma.judgeTrack.findMany({ where: { judgeId: user.id }, select: { trackId: true } });
    const trackIds = judgeTracks.map((jt: any) => jt.trackId);
    if (trackIds.length > 0) where = { eventId: event.id, OR: [{ trackId: { in: trackIds } }, { trackId: null }] };
  }

  const teams = await prisma.team.findMany({ where, include: { track: true } });
  return success(teams.map((t: any) => ({ id: t.id, name: t.name, track: t.track?.name ?? null, tableNumber: t.tableNumber, members: t.members })));
}
