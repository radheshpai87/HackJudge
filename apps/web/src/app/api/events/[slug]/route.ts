import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { success, apiError } from "@/lib/api-response";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
  return success({ ...(event.configJson as any), status: "open" });
}
