import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { requireEventOwner, AuthError } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export const dynamic = 'force-dynamic';

// GET /api/events/[slug]/judges
async function handleList(req: NextRequest, slug: string) {
  try {
    const { eventId } = await requireEventOwner(req, slug);
    const [judges, allTeams] = await Promise.all([
      prisma.judge.findMany({
        where: { eventId },
        include: { judgeTracks: { include: { track: true } }, scoreSubmissions: true, assignments: true },
      }),
      prisma.team.findMany({
        where: { eventId },
        select: { id: true, trackId: true },
      }),
    ]);
    return success(judges.map((j: any) => {
      let denominator = j.assignments.length;
      if (denominator === 0) {
        const judgeTrackIds = j.judgeTracks.map((jt: any) => jt.trackId);
        const targetTeams = allTeams.filter((t: any) => {
          if (judgeTrackIds.length === 0) return true;
          return t.trackId === null || judgeTrackIds.includes(t.trackId);
        });
        denominator = targetTeams.length;
      }
      return {
        id: j.id, name: j.name, email: j.email,
        tracks: j.judgeTracks.map((jt: any) => jt.track.name),
        hasPin: !!j.passwordHash,
        completion: denominator > 0 ? Math.round((j.scoreSubmissions.length / denominator) * 100) : 0,
      };
    }));
  } catch (err: any) {
    if (err instanceof AuthError) {
      throw err;
    }
    console.error("Error fetching judges:", err instanceof Error ? err.message : err);
    throw err;  // Re-throw original error to preserve details
  }
}

// PUT /api/events/[slug]/judges/[judgeId]/pin
async function handleSetPin(req: NextRequest, slug: string, judgeId: string) {
  try {
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
  } catch (err: any) {
    if (err instanceof AuthError) {
      throw err;
    }
    console.error("Error setting judge PIN:", err instanceof Error ? err.message : err);
    throw err;
  }
}

// DELETE /api/events/[slug]/judges/[judgeId]/pin
async function handleClearPin(req: NextRequest, slug: string, judgeId: string) {
  try {
    const { eventId } = await requireEventOwner(req, slug);
    await prisma.judge.updateMany({ where: { id: judgeId, eventId }, data: { passwordHash: null } });
    return success({ cleared: true });
  } catch (err: any) {
    if (err instanceof AuthError) {
      throw err;
    }
    console.error("Error clearing judge PIN:", err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    return await handleList(req, params.slug);
  } catch (e: any) {
    if (e instanceof AuthError) return apiError(e.code, e.message, null, e.status);
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message || "Internal error", null, 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const path = req.nextUrl.pathname.replace(`/api/events/${params.slug}/judges`, "").replace(/\/$/, "");
  try {
    const m = path.match(/^\/([^/]+)\/pin$/);
    if (m) return await handleSetPin(req, params.slug, m[1]);
    return apiError("NOT_FOUND", "Route not found", null, 404);
  } catch (e: any) {
    if (e instanceof AuthError) return apiError(e.code, e.message, null, e.status);
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message, null, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const path = req.nextUrl.pathname.replace(`/api/events/${params.slug}/judges`, "").replace(/\/$/, "");
  try {
    const m = path.match(/^\/([^/]+)\/pin$/);
    if (m) return await handleClearPin(req, params.slug, m[1]);
    return apiError("NOT_FOUND", "Route not found", null, 404);
  } catch (e: any) {
    if (e instanceof AuthError) return apiError(e.code, e.message, null, e.status);
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message, null, 500);
  }
}
