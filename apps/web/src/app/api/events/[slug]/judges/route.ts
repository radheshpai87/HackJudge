import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { requireAuth, requireOrganizer, requireJudge } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

// GET /api/events/[slug]/judges
async function handleList(req: NextRequest, slug: string) {
  const user = requireAuth(req);
  requireOrganizer(user);
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
  const judges = await prisma.judge.findMany({
    where: { eventId: event.id },
    include: { judgeTracks: { include: { track: true } }, scoreSubmissions: true, assignments: true },
  });
  return success(judges.map((j) => ({
    id: j.id, name: j.name, email: j.email,
    tracks: j.judgeTracks.map((jt) => jt.track.name),
    hasPin: !!j.passwordHash,
    completion: j.assignments.length > 0 ? Math.round((j.scoreSubmissions.length / j.assignments.length) * 100) : 0,
  })));
}

// GET /api/events/[slug]/judges/me
async function handleMe(req: NextRequest, slug: string) {
  const user = requireAuth(req);
  requireJudge(user);
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
  const judge = await prisma.judge.findFirst({
    where: { eventId: event.id, id: user.id },
    include: { judgeTracks: { include: { track: true } }, assignments: { include: { team: { include: { track: true } } } }, scoreSubmissions: true },
  });
  if (!judge) return apiError("JUDGE_NOT_FOUND", "Judge not found", null, 404);

  const completedTeamIds = judge.scoreSubmissions.map((s) => s.teamId);
  let teamList: { id: string; name: string; track: string | null; trackId: string | null; tableNumber: string | null; members: string[] }[];

  if (judge.assignments.length > 0) {
    teamList = judge.assignments.map((a) => ({ id: a.team.id, name: a.team.name, track: a.team.track?.name ?? null, trackId: a.team.trackId, tableNumber: a.team.tableNumber, members: a.team.members as string[] }));
  } else {
    const judgeTrackIds = judge.judgeTracks.map((jt) => jt.trackId);
    const allTeams = await prisma.team.findMany({
      where: { eventId: event.id, ...(judgeTrackIds.length > 0 ? { OR: [{ trackId: null }, { trackId: { in: judgeTrackIds } }] } : {}) },
      include: { track: true }, orderBy: { name: "asc" },
    });
    teamList = allTeams.map((t) => ({ id: t.id, name: t.name, track: (t as any).track?.name ?? null, trackId: t.trackId, tableNumber: t.tableNumber, members: t.members as string[] }));
  }

  const totalAssigned = teamList.length;
  const completed = judge.scoreSubmissions.length;
  return success({
    judge: { id: judge.id, name: judge.name, email: judge.email },
    tracks: judge.judgeTracks.map((jt) => jt.track.name),
    assignments: teamList,
    completedTeamIds,
    progress: { totalAssigned, completed, percent: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0 },
  });
}

// GET /api/events/[slug]/judges/my-scores/[teamId]
async function handleMyScores(req: NextRequest, slug: string, teamId: string) {
  const user = requireAuth(req);
  requireJudge(user);
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
  const team = await prisma.team.findFirst({ where: { id: teamId, eventId: event.id } });
  if (!team) return apiError("TEAM_NOT_FOUND", "Team not found", null, 404);
  const [scores, submission] = await Promise.all([
    prisma.score.findMany({ where: { judgeId: user.id, teamId } }),
    prisma.scoreSubmission.findFirst({ where: { judgeId: user.id, teamId } }),
  ]);
  return success({ scores: scores.map((s) => ({ criterionId: s.criterionId, value: s.value })), notes: (submission as any)?.notes ?? "", submitted: !!submission });
}

// PUT /api/events/[slug]/judges/[judgeId]/pin
async function handleSetPin(req: NextRequest, slug: string, judgeId: string) {
  const user = requireAuth(req);
  requireOrganizer(user);
  const body = await req.json();
  const schema = z.object({ pin: z.string().min(4).max(12) });
  const parse = schema.safeParse(body);
  if (!parse.success) return apiError("VALIDATION_ERROR", "PIN must be 4–12 characters");
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
  const judge = await prisma.judge.findFirst({ where: { id: judgeId, eventId: event.id } });
  if (!judge) return apiError("JUDGE_NOT_FOUND", "Judge not found", null, 404);
  const hash = await bcrypt.hash(parse.data.pin, 10);
  await prisma.judge.update({ where: { id: judge.id }, data: { passwordHash: hash } });
  return success({ updated: true });
}

// DELETE /api/events/[slug]/judges/[judgeId]/pin
async function handleClearPin(req: NextRequest, slug: string, judgeId: string) {
  const user = requireAuth(req);
  requireOrganizer(user);
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
  await prisma.judge.updateMany({ where: { id: judgeId, eventId: event.id }, data: { passwordHash: null } });
  return success({ cleared: true });
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const path = req.nextUrl.pathname.replace(`/api/events/${params.slug}/judges`, "").replace(/\/$/, "");
  try {
    if (path === "" || path === "/") return handleList(req, params.slug);
    if (path === "/me") return handleMe(req, params.slug);
    if (path.startsWith("/my-scores/")) return handleMyScores(req, params.slug, path.replace("/my-scores/", ""));
    return apiError("NOT_FOUND", "Route not found", null, 404);
  } catch (e: any) {
    if (e.name === "AuthError") return apiError(e.code, e.message, null, e.status);
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message, null, 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const path = req.nextUrl.pathname.replace(`/api/events/${params.slug}/judges`, "").replace(/\/$/, "");
  try {
    const m = path.match(/^\/([^/]+)\/pin$/);
    if (m) return handleSetPin(req, params.slug, m[1]);
    return apiError("NOT_FOUND", "Route not found", null, 404);
  } catch (e: any) {
    if (e.name === "AuthError") return apiError(e.code, e.message, null, e.status);
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message, null, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const path = req.nextUrl.pathname.replace(`/api/events/${params.slug}/judges`, "").replace(/\/$/, "");
  try {
    const m = path.match(/^\/([^/]+)\/pin$/);
    if (m) return handleClearPin(req, params.slug, m[1]);
    return apiError("NOT_FOUND", "Route not found", null, 404);
  } catch (e: any) {
    if (e.name === "AuthError") return apiError(e.code, e.message, null, e.status);
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message, null, 500);
  }
}
