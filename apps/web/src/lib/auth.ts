import { verifyAccessToken } from "./jwt";
import { prisma } from "@hackjudge/db";

export interface AuthUser {
  id: string;
  eventId?: string;
  role: string;
  email?: string;
}

export function getAuthUser(request: Request): AuthUser | null {
  const header = request.headers.get("authorization");
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");

  const token = queryToken ?? header?.slice(7);
  if (!token) return null;

  try {
    const decoded = verifyAccessToken(token) as any;
    return { ...decoded, id: decoded.id ?? decoded.judgeId };
  } catch {
    return null;
  }
}

export function requireAuth(request: Request): AuthUser {
  const user = getAuthUser(request);
  if (!user) {
    throw new AuthError("UNAUTHORIZED", "Missing or invalid authorization", 401);
  }
  return user;
}

export function requireOrganizer(user: AuthUser): AuthUser {
  if (user.role !== "organizer") {
    throw new AuthError("FORBIDDEN", "Organizer role required", 403);
  }
  return user;
}

export function requireJudge(user: AuthUser): AuthUser {
  if (user.role !== "judge") {
    throw new AuthError("FORBIDDEN", "Judge role required", 403);
  }
  return user;
}

export async function requireEventOwner(request: Request, eventSlug: string): Promise<{ user: AuthUser; eventId: string }> {
  const user = requireAuth(request);
  requireOrganizer(user);

  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    select: { id: true, userId: true },
  });
  if (!event) {
    throw new AuthError("EVENT_NOT_FOUND", "Event not found", 404);
  }
  if (event.userId && event.userId !== user.id) {
    throw new AuthError("FORBIDDEN", "You do not have access to this event", 403);
  }
  return { user, eventId: event.id };
}

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
