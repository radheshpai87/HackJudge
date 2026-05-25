import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { auditLog } from "@/lib/audit-log";
import { success, apiError } from "@/lib/api-response";
import { requireAuth, requireOrganizer, AuthError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const schema = z.union([
      z.object({
        email: z.string().email(),
        pin: z.string().min(1),
        eventSlug: z.string(),
        tokenExchange: z.undefined(),
      }),
      z.object({
        eventSlug: z.string(),
        tokenExchange: z.literal(true),
      }),
    ]);

    const parse = schema.safeParse(body);
    if (!parse.success) {
      return apiError("VALIDATION_ERROR", "Invalid request", parse.error.format());
    }

    const event = await prisma.event.findUnique({
      where: { slug: parse.data.eventSlug },
    });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

    let judge: any = null;
    let isOrganizerFlow = false;
    let organizer: any = null;

    if (parse.data.tokenExchange) {
      // Token exchange flow for logged-in organizer
      try {
        const user = requireAuth(req);
        requireOrganizer(user);

        if (event.userId && event.userId !== user.id) {
          return apiError("UNAUTHORIZED", "You do not own this event", null, 401);
        }

        organizer = await prisma.user.findFirst({
          where: { id: user.id },
        });
        if (!organizer) {
          return apiError("UNAUTHORIZED", "Organizer profile not found", null, 401);
        }

        isOrganizerFlow = true;
      } catch (err: any) {
        if (err instanceof AuthError) {
          return apiError(err.code, err.message, null, err.status);
        }
        throw err;
      }
    } else {
      // Normal email/PIN password flow
      const emailNormalized = parse.data.email.toLowerCase().trim();

      // Check if there is an organizer with this email who owns this event
      organizer = await prisma.user.findFirst({
        where: { email: emailNormalized, role: "organizer" },
      });

      judge = await prisma.judge.findFirst({
        where: { email: emailNormalized, eventId: event.id },
      });

      let authenticated = false;

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
    }

    // Resolve or auto-provision the Judge record
    const emailNormalized = organizer ? organizer.email : ("email" in parse.data ? parse.data.email.toLowerCase().trim() : "");
    if (isOrganizerFlow && organizer) {
      judge = await prisma.judge.findFirst({
        where: { email: organizer.email, eventId: event.id },
      });

      if (!judge) {
        judge = await prisma.judge.create({
          data: {
            eventId: event.id,
            name: organizer.name,
            email: organizer.email,
            passwordHash: organizer.passwordHash || "google-auth",
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
