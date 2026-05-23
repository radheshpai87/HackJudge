import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireEventOwner, AuthError } from "@/lib/auth";
import { success, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { eventId } = await requireEventOwner(req, params.slug);
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
    const snapshot = await prisma.resultSnapshot.findFirst({ where: { eventId: event.id }, orderBy: { generatedAt: "desc" } });
    if (!snapshot) return apiError("RESULTS_NOT_FOUND", "No results generated yet", null, 404);
    return success(snapshot.data);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Results endpoint error:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch results", null, 500);
  }
}
