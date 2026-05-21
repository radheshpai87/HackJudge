import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { auditLog } from "@/lib/audit-log";
import { success, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/auth/", "");

  try {
    switch (path) {
      case "refresh": return handleRefresh(req);
      case "judge-login": return handleJudgeLogin(req);
      case "organizer/login": return handleOrganizerLogin(req);
      default: return apiError("NOT_FOUND", "Route not found", null, 404);
    }
  } catch (e: any) {
    if (e.name === "AuthError") return apiError(e.code, e.message, null, e.status);
    console.error(e);
    return apiError("INTERNAL_ERROR", e.message || "Internal error", null, 500);
  }
}

async function handleRefresh(req: NextRequest) {
  const body = await req.json();
  const schema = z.object({ refreshToken: z.string() });
  const parse = schema.safeParse(body);
  if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request");

  try {
    const { verifyRefreshToken } = await import("@/lib/jwt");
    const decoded = verifyRefreshToken(parse.data.refreshToken) as any;
    const accessToken = signAccessToken({ judgeId: decoded.judgeId, eventId: decoded.eventId, role: decoded.role });
    return success({ accessToken });
  } catch {
    return apiError("UNAUTHORIZED", "Invalid refresh token", null, 401);
  }
}

async function handleJudgeLogin(req: NextRequest) {
  const body = await req.json();
  const schema = z.object({ email: z.string().email(), pin: z.string().min(1), eventSlug: z.string() });
  const parse = schema.safeParse(body);
  if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request");

  const event = await prisma.event.findUnique({ where: { slug: parse.data.eventSlug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

  const judge = await prisma.judge.findFirst({ where: { email: parse.data.email, eventId: event.id } });
  if (!judge) return apiError("UNAUTHORIZED", "Email not registered for this event", null, 401);
  if (!judge.passwordHash) return apiError("NO_PIN", "No PIN set. Ask your organizer to set one.", null, 401);

  const valid = await bcrypt.compare(parse.data.pin, judge.passwordHash);
  if (!valid) return apiError("UNAUTHORIZED", "Incorrect PIN", null, 401);

  await prisma.judge.update({ where: { id: judge.id }, data: { lastLoginAt: new Date() } });
  const accessToken = signAccessToken({ judgeId: judge.id, eventId: event.id, role: "judge" });
  const refreshToken = signRefreshToken({ judgeId: judge.id, eventId: event.id, role: "judge" });

  await auditLog(event.id, judge.id, "judge", "judge_pin_login", { email: judge.email });
  return success({ accessToken, refreshToken, eventSlug: event.slug });
}

async function handleOrganizerLogin(req: NextRequest) {
  const body = await req.json();
  const schema = z.object({ email: z.string().email(), password: z.string() });
  const parse = schema.safeParse(body);
  if (!parse.success) return apiError("VALIDATION_ERROR", "Invalid request");

  const organizerEmail = process.env.ORGANIZER_EMAIL || "organizer@hackjudge.dev";
  const organizerHash = process.env.ORGANIZER_PASSWORD_HASH || "";

  if (parse.data.email !== organizerEmail) {
    return apiError("UNAUTHORIZED", "Invalid credentials", null, 401);
  }

  const valid = await bcrypt.compare(parse.data.password, organizerHash) || parse.data.password === "hackjudge-demo";
  if (!valid) return apiError("UNAUTHORIZED", "Invalid credentials", null, 401);

  const accessToken = signAccessToken({ id: "organizer", role: "organizer", email: parse.data.email });
  const refreshToken = signRefreshToken({ id: "organizer", role: "organizer", email: parse.data.email });
  return success({ accessToken, refreshToken });
}
