import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireAuth, requireJudge } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const user = requireAuth(req);
    requireJudge(user);
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

    const judge = await prisma.judge.findFirst({
      where: { eventId: event.id, id: user.id },
      include: {
        judgeTracks: { include: { track: true } },
        assignments: { include: { team: { include: { track: true } } } },
        scoreSubmissions: true,
      },
    });
    if (!judge) return apiError("JUDGE_NOT_FOUND", "Judge not found", null, 404);

    const completedTeamIds = judge.scoreSubmissions.map((s: any) => s.teamId);
    let teamList: { id: string; name: string; track: string | null; trackId: string | null; tableNumber: string | null; members: string[] }[];

    if (judge.assignments.length > 0) {
      teamList = judge.assignments.map((a: any) => ({
        id: a.team.id,
        name: a.team.name,
        track: a.team.track?.name ?? null,
        trackId: a.team.trackId,
        tableNumber: a.team.tableNumber,
        members: a.team.members as string[],
      }));
    } else {
      const judgeTrackIds = judge.judgeTracks.map((jt: any) => jt.trackId);
      const allTeams = await prisma.team.findMany({
        where: {
          eventId: event.id,
          ...(judgeTrackIds.length > 0 ? { OR: [{ trackId: null }, { trackId: { in: judgeTrackIds } }] } : {}),
        },
        include: { track: true },
        orderBy: { name: "asc" },
      });
      teamList = allTeams.map((t: any) => ({
        id: t.id,
        name: t.name,
        track: (t as any).track?.name ?? null,
        trackId: t.trackId,
        tableNumber: t.tableNumber,
        members: t.members as string[],
      }));
    }

    const totalAssigned = teamList.length;
    const completed = judge.scoreSubmissions.length;
    return success({
      judge: { id: judge.id, name: judge.name, email: judge.email },
      tracks: judge.judgeTracks.map((jt: any) => jt.track.name),
      assignments: teamList,
      completedTeamIds,
      progress: {
        totalAssigned,
        completed,
        percent: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0,
      },
    });
  } catch (e: any) {
    if (e.name === "AuthError") return apiError(e.code, e.message, null, e.status);
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message || "Internal error", null, 500);
  }
}
