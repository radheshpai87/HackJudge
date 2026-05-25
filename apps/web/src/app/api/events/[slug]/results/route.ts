import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireEventOwner, AuthError } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

import { computeResults } from "@/lib/results-engine";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { eventId } = await requireEventOwner(req, params.slug);
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

    const results = await computeResults(event.id);

    // Sync to resultSnapshot so exports are also perfectly updated
    const latestSnapshot = await prisma.resultSnapshot.findFirst({
      where: { eventId: event.id },
      orderBy: { generatedAt: "desc" }
    });

    if (latestSnapshot) {
      await prisma.resultSnapshot.update({
        where: { id: latestSnapshot.id },
        data: { data: results as any, generatedAt: new Date().toISOString() as any }
      });
    } else {
      await prisma.resultSnapshot.create({
        data: {
          eventId: event.id,
          data: results as any,
          isPublished: true,
          generatedAt: new Date().toISOString() as any
        }
      });
    }

    return success(results);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Results endpoint error:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch results", null, 500);
  }
}
