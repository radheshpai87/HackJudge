import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { requireAuth, requireJudge } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const user = requireAuth(req);
  requireJudge(user);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

  const body = await req.json();
  const schema = z.object({ teamId: z.string(), notes: z.string() });
  const parse = schema.safeParse(body);
  if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request");

  const { teamId, notes } = parse.data;
  const submission = await prisma.scoreSubmission.findFirst({ where: { judgeId: user.id, teamId } });
  if (!submission) return apiError("SUBMISSION_NOT_FOUND", "Submit scores first before saving notes", null, 404);
  await prisma.scoreSubmission.update({ where: { id: submission.id }, data: { notes } as any });
  return success({ updated: true });
}
