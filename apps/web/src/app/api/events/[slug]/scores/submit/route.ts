import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { requireAuth, requireJudge, AuthError } from "@/lib/auth";
import { auditLog } from "@/lib/audit-log";
import { success, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const user = requireAuth(req);
    requireJudge(user);
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

    const body = await req.json();
    const schema = z.object({ teamId: z.string(), notes: z.string().optional() });
    const parse = schema.safeParse(body);
    if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request");

    const { teamId, notes } = parse.data;
    const existingSub = await prisma.scoreSubmission.findFirst({ where: { judgeId: user.id, teamId } });
    if (existingSub) {
      await prisma.scoreSubmission.update({ where: { id: existingSub.id }, data: { completedAt: new Date(), ...(notes !== undefined ? { notes } : {}) } as any });
    } else {
      await prisma.scoreSubmission.create({ data: { judgeId: user.id, teamId, eventId: event.id, ...(notes !== undefined ? { notes } : {}) } as any });
    }

    await auditLog(event.id, user.id, "judge", "scores_submitted", { teamId });
    return success({ submitted: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Score submit error:", error);
    return apiError("INTERNAL_ERROR", "Failed to submit scores", null, 500);
  }
}
