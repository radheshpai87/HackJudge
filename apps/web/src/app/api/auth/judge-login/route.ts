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

    const emailNormalized = parse.data.email.toLowerCase().trim();

    // Check if there is an organizer with this email who owns this event
    const organizer = await prisma.user.findFirst({
      where: { email: emailNormalized, role: "organizer" },
    });

    let judge = await prisma.judge.findFirst({
      where: { email: emailNormalized, eventId: event.id },
    });

    let authenticated = false;
    let isOrganizerFlow = false;

    // Organizer credential check
    if (organizer && organizer.passwordHash) {
      if (!event.userId || event.userId === organizer.id) {
        const valid = await bcrypt.compare(parse.data.pin, organizer.passwordHash);
        if (valid) {
          authenticated = true;
          isOrganizerFlow = true;
        }
      }
    }

    // Standard judge check if organizer flow didn't authenticate
    if (!authenticated && judge && judge.passwordHash) {
      const valid = await bcrypt.compare(parse.data.pin, judge.passwordHash);
      if (valid) {
        authenticated = true;
      }
    }

    if (!authenticated) {
      if (judge) {
        return apiError("UNAUTHORIZED", "Incorrect PIN", null, 401);
      }
      return apiError("UNAUTHORIZED", "Email not registered for this event", null, 401);
    }

    // If organizer authenticated successfully, ensure they have a judge record in this event
    if (isOrganizerFlow && organizer) {
      if (!judge) {
        judge = await prisma.judge.create({
          data: {
            eventId: event.id,
            name: organizer.name,
            email: organizer.email,
            passwordHash: organizer.passwordHash,
          },
        });
      }
    }

    if (!judge) {
      return apiError("UNAUTHORIZED", "Failed to resolve judge profile", null, 401);
    }

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

    await auditLog(event.id, judge.id, "judge", "judge_pin_login", { email: judge.email, isOrganizer: isOrganizerFlow });

    return success({ accessToken, refreshToken, eventSlug: event.slug });
  } catch (e: any) {
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message || "Internal error", null, 500);
  }
}
