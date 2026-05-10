import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { error } from "@hackjudge/shared";

export interface AuthRequest extends Request {
  user?: { id: string; eventId?: string; role: string; email?: string };
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json(error("UNAUTHORIZED", "Missing or invalid authorization header"));
    return;
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = { ...decoded, id: decoded.id ?? decoded.judgeId };
    next();
  } catch {
    res.status(401).json(error("UNAUTHORIZED", "Invalid or expired token"));
  }
}

export function requireJudge(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "judge") {
    res.status(403).json(error("FORBIDDEN", "Judge role required"));
    return;
  }
  next();
}

export function requireOrganizer(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "organizer") {
    res.status(403).json(error("FORBIDDEN", "Organizer role required"));
    return;
  }
  next();
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export async function auditLog(eventId: string, actorId: string, actorType: string, action: string, payload?: object) {
  try {
    const { prisma } = await import("@hackjudge/db");
    await prisma.auditLog.create({
      data: { eventId, actorId, actorType, action, payload: payload ?? {} },
    });
  } catch {
    // Silent fail so audit logging never breaks the request
  }
}
