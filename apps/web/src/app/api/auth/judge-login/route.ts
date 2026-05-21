import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { auditLog } from "@/lib/audit-log";
import { success, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schema = z.object({
      email: z.string().email(),
      pin: z.string().min(1),
      eventSlug: z.string(),
    });
    const parse = schema.safeParse(body);
    if (!parse.success) {
      return apiError("VALIDATION_ERROR", "Invalid request", parse.error.format());
    }

    const event = await prisma.event.findUnique({
      where: { slug: parse.data.eventSlug },
    });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

    const judge = await prisma.judge.findFirst({
      where: { email: parse.data.email, eventId: event.id },
    });
    if (!judge) return apiError("UNAUTHORIZED", "Email not registered for this event", null, 401);
    if (!judge.passwordHash) {
      return apiError("NO_PIN", "No PIN set. Ask your organizer to set one.", null, 401);
    }

    const valid = await bcrypt.compare(parse.data.pin, judge.passwordHash);
    if (!valid) return apiError("UNAUTHORIZED", "Incorrect PIN", null, 401);

    await prisma.judge.update({
      where: { id: judge.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = signAccessToken({
      judgeId: judge.id,
      eventId: event.id,
      role: "judge",
    });
    const refreshToken = signRefreshToken({
      judgeId: judge.id,
      eventId: event.id,
      role: "judge",
    });

    await auditLog(event.id, judge.id, "judge", "judge_pin_login", { email: judge.email });

    return success({ accessToken, refreshToken, eventSlug: event.slug });
  } catch (e: any) {
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message || "Internal error", null, 500);
  }
}
