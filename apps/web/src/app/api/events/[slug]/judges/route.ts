import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { requireEventOwner } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

// GET /api/events/[slug]/judges
async function handleList(req: NextRequest, slug: string) {
  const { eventId } = await requireEventOwner(req, slug);
  const judges = await prisma.judge.findMany({
    where: { eventId },
    include: { judgeTracks: { include: { track: true } }, scoreSubmissions: true, assignments: true },
  });
  return success(judges.map((j) => ({
    id: j.id, name: j.name, email: j.email,
    tracks: j.judgeTracks.map((jt) => jt.track.name),
    hasPin: !!j.passwordHash,
    completion: j.assignments.length > 0 ? Math.round((j.scoreSubmissions.length / j.assignments.length) * 100) : 0,
  })));
}

// PUT /api/events/[slug]/judges/[judgeId]/pin
async function handleSetPin(req: NextRequest, slug: string, judgeId: string) {
  const { eventId } = await requireEventOwner(req, slug);
  const body = await req.json();
  const schema = z.object({ pin: z.string().min(4).max(12) });
  const parse = schema.safeParse(body);
  if (!parse.success) return apiError("VALIDATION_ERROR", "PIN must be 4–12 characters");
  const judge = await prisma.judge.findFirst({ where: { id: judgeId, eventId } });
  if (!judge) return apiError("JUDGE_NOT_FOUND", "Judge not found", null, 404);
  const hash = await bcrypt.hash(parse.data.pin, 10);
  await prisma.judge.update({ where: { id: judge.id }, data: { passwordHash: hash } });
  return success({ updated: true });
}

// DELETE /api/events/[slug]/judges/[judgeId]/pin
async function handleClearPin(req: NextRequest, slug: string, judgeId: string) {
  const { eventId } = await requireEventOwner(req, slug);
  await prisma.judge.updateMany({ where: { id: judgeId, eventId }, data: { passwordHash: null } });
  return success({ cleared: true });
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    return await handleList(req, params.slug);
  } catch (e: any) {
    if (e.name === "AuthError") return apiError(e.code, e.message, null, e.status);
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message || "Internal error", null, 500);
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
