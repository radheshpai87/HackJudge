import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireEventOwner } from "@/lib/auth";
import { apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { eventId } = await requireEventOwner(req, params.slug);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
  const snapshot = await prisma.resultSnapshot.findFirst({ where: { eventId: event.id }, orderBy: { generatedAt: "desc" } });
  if (!snapshot) return apiError("RESULTS_NOT_FOUND", "No results generated yet", null, 404);

  const data = snapshot.data as any;
  const rows: string[] = ["Rank,Team,Track,Score,Judges"];
  data.overallRanking.forEach((team: any, idx: number) => {
    rows.push(`${idx + 1},"${team.teamName}","${team.trackName ?? ""}",${team.score ?? ""},${team.judgeCount}`);
  });

  return new Response(rows.join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${params.slug}-results.csv"` },
  });
}
