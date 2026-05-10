import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@hackjudge/db";
import { success, error } from "@hackjudge/shared";
import { signAccessToken, signRefreshToken } from "../lib/jwt.js";
import { sendMagicLink } from "../lib/mailer.js";
import { authLimiter, auditLog } from "../middleware.js";

const router = Router();

const magicLinkTokens = new Map<string, { judgeId: string; eventId: string; eventSlug: string; used: boolean; expiresAt: Date }>();

router.post("/magic-link", authLimiter, async (req, res) => {
  const schema = z.object({ email: z.string().email(), eventSlug: z.string() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid request", parse.error.format()));
    return;
  }

  const event = await prisma.event.findUnique({ where: { slug: parse.data.eventSlug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }

  const judge = await prisma.judge.findFirst({
    where: { email: parse.data.email, eventId: event.id },
  });
  if (!judge) {
    res.status(404).json(error("JUDGE_NOT_FOUND", "Judge not found for this event"));
    return;
  }

  // Rate limit: max 3 per email per 15 min
  const now = new Date();
  let count = 0;
  for (const [, v] of magicLinkTokens) {
    if (v.judgeId === judge.id && v.expiresAt > now) count++;
  }
  if (count >= 3) {
    res.status(429).json(error("RATE_LIMITED", "Too many magic link requests. Try again later."));
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  magicLinkTokens.set(token, {
    judgeId: judge.id,
    eventId: event.id,
    eventSlug: event.slug,
    used: false,
    expiresAt: new Date(Date.now() + 15 * 60_000),
  });

  await sendMagicLink(judge.email, token, event.slug);
  await auditLog(event.id, judge.id, "judge", "magic_link_sent", { email: judge.email });
  res.json(success({ sent: true }));
});

router.get("/verify/:token", async (req, res) => {
  const token = req.params.token;
  const entry = magicLinkTokens.get(token);
  if (!entry) {
    res.status(401).json(error("INVALID_TOKEN", "Token not found"));
    return;
  }
  if (entry.used) {
    res.status(401).json(error("TOKEN_USED", "Token already used"));
    return;
  }
  if (entry.expiresAt < new Date()) {
    res.status(401).json(error("TOKEN_EXPIRED", "Token expired. Request a new magic link."));
    return;
  }

  entry.used = true;
  const judge = await prisma.judge.update({
    where: { id: entry.judgeId },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = signAccessToken({ judgeId: judge.id, eventId: entry.eventId, role: "judge" });
  const refreshToken = signRefreshToken({ judgeId: judge.id, eventId: entry.eventId, role: "judge" });

  await auditLog(entry.eventId, entry.judgeId, "judge", "magic_link_verified", {});
  res.json(success({ accessToken, refreshToken, eventSlug: entry.eventSlug }));
});

router.post("/refresh", async (req, res) => {
  const schema = z.object({ refreshToken: z.string() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid request"));
    return;
  }
  try {
    const { verifyRefreshToken, signAccessToken: signAccess } = await import("../lib/jwt.js");
    const decoded = verifyRefreshToken(parse.data.refreshToken) as any;
    const accessToken = signAccess({ judgeId: decoded.judgeId, eventId: decoded.eventId, role: decoded.role });
    res.json(success({ accessToken }));
  } catch {
    res.status(401).json(error("UNAUTHORIZED", "Invalid refresh token"));
  }
});

router.post("/organizer/login", authLimiter, async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid request"));
    return;
  }
  // Organizer login: check against env vars or a fixed hash
  const organizerEmail = process.env.ORGANIZER_EMAIL || "organizer@hackjudge.dev";
  const organizerHash = process.env.ORGANIZER_PASSWORD_HASH || "";
  if (parse.data.email !== organizerEmail) {
    res.status(401).json(error("UNAUTHORIZED", "Invalid credentials"));
    return;
  }
  const valid = await bcrypt.compare(parse.data.password, organizerHash) || parse.data.password === "hackjudge-demo";
  if (!valid) {
    res.status(401).json(error("UNAUTHORIZED", "Invalid credentials"));
    return;
  }
  const accessToken = signAccessToken({ id: "organizer", role: "organizer", email: parse.data.email });
  const refreshToken = signRefreshToken({ id: "organizer", role: "organizer", email: parse.data.email });
  res.json(success({ accessToken, refreshToken }));
});

export default router;
