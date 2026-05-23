import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireEventOwner, AuthError } from "@/lib/auth";
import { computeResults } from "@/lib/results-engine";
import { success, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { user, eventId } = await requireEventOwner(req, params.slug);
    const event = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

    const results = await computeResults(event.id);
    const snapshot = await prisma.resultSnapshot.create({ data: { eventId: event.id, data: results as any, isPublished: true } });

    const config = event.configJson as any;
    const webhookUrl = config.results?.export?.webhook_url;
    if (webhookUrl) {
      const body = JSON.stringify(results);
      const secret = config.results?.export?.webhook_secret;
      const signature = secret ? require("crypto").createHmac("sha256", secret).update(body).digest("hex") : "";
      fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", ...(signature ? { "X-HackJudge-Signature": `sha256=${signature}` } : {}) }, body }).catch(() => {});
    }

    return success({ snapshotId: snapshot.id, ...results });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, null, error.status);
    }
    console.error("Results generate error:", error);
    return apiError("INTERNAL_ERROR", "Failed to generate results", null, 500);
  }
}
