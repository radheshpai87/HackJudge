import { prisma } from "@hackjudge/db";

export async function auditLog(
  eventId: string,
  actorId: string,
  actorType: string,
  action: string,
  payload?: object
) {
  try {
    await prisma.auditLog.create({
      data: { eventId, actorId, actorType, action, payload: payload ?? {} },
    });
  } catch {
    // Silent fail so audit logging never breaks the request
  }
}
