import { NextRequest } from "next/server";
import { prisma } from "@hackjudge/db";
import { requireEventOwner } from "@/lib/auth";
import { computeResults } from "@/lib/results-engine";
import { apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { eventId } = await requireEventOwner(req, params.slug);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);

  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  const snapshot = await prisma.resultSnapshot.findFirst({ where: { eventId: event.id }, orderBy: { generatedAt: "desc" } });
  let data: Awaited<ReturnType<typeof computeResults>>;
  if (snapshot) { data = snapshot.data as any; }
  else { data = await computeResults(event.id); }

  const overallSheet = workbook.addWorksheet("Overall");
  overallSheet.columns = [
    { header: "Rank", key: "rank", width: 8 }, { header: "Team", key: "teamName", width: 30 },
    { header: "Score", key: "score", width: 12 }, { header: "Judges", key: "judgeCount", width: 10 },
    { header: "Track", key: "trackName", width: 20 },
  ];
  overallSheet.getRow(1).font = { bold: true };
  data.overallRanking.forEach((team, idx) => {
    overallSheet.addRow({ rank: idx + 1, teamName: team.teamName, score: team.score ?? "N/A", judgeCount: team.judgeCount, trackName: team.trackName ?? "Overall" });
  });

  for (const [trackId, teams] of Object.entries(data.trackRankings)) {
    const trackName = trackId === "overall" ? "Overall" : (teams as any[])[0]?.trackName ?? trackId;
    const sheet = workbook.addWorksheet(trackName.substring(0, 31));
    sheet.columns = [
      { header: "Rank", key: "rank", width: 8 }, { header: "Team", key: "teamName", width: 30 },
      { header: "Score", key: "score", width: 12 }, { header: "Judges", key: "judgeCount", width: 10 },
    ];
    sheet.getRow(1).font = { bold: true };
    (teams as any[]).forEach((team, idx) => { sheet.addRow({ rank: idx + 1, teamName: team.teamName, score: team.score ?? "N/A", judgeCount: team.judgeCount }); });
  }

  const detailSheet = workbook.addWorksheet("Detailed");
  const criteriaNames = data.teams[0]?.criteriaBreakdown.map((c: any) => c.criterionName) ?? [];
  detailSheet.columns = [
    { header: "Team", key: "teamName", width: 30 },
    ...criteriaNames.map((name: string) => ({ header: name, key: name, width: 15 })),
    { header: "Total Score", key: "totalScore", width: 12 }, { header: "Judges", key: "judgeCount", width: 10 },
  ];
  detailSheet.getRow(1).font = { bold: true };
  for (const team of data.teams) {
    const row: Record<string, any> = { teamName: team.teamName, totalScore: team.score ?? "N/A", judgeCount: team.judgeCount };
    for (const crit of team.criteriaBreakdown) { row[crit.criterionName] = Math.round(crit.weightedScore * 100) / 100; }
    detailSheet.addRow(row);
  }

  const buf = await workbook.xlsx.writeBuffer();
  return new Response(buf as any, {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${params.slug}-results.xlsx"` },
  });
}
