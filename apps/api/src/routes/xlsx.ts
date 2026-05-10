import { Router, Request, Response } from "express";
import { prisma } from "@hackjudge/db";
import { success, error } from "@hackjudge/shared";
import { requireAuth, requireOrganizer } from "../middleware.js";
import { computeResults } from "../results/engine.js";

/**
 * Excel (.xlsx) export route.
 * This streams a styled Excel workbook with multiple sheets:
 * - Overall Ranking
 * - Per-Track Rankings
 * - Detailed Scores
 */
const router = Router({ mergeParams: true });

router.get("/:slug/results/export/xlsx", requireAuth, requireOrganizer, async (req: Request, res: Response) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }

  // Dynamically import exceljs to keep bundle light when not needed
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  // Fetch or compute results
  const snapshot = await prisma.resultSnapshot.findFirst({
    where: { eventId: event.id },
    orderBy: { generatedAt: "desc" },
  });

  let data: Awaited<ReturnType<typeof computeResults>>;
  if (snapshot) {
    data = snapshot.data as any;
  } else {
    data = await computeResults(event.id);
  }

  // Sheet 1: Overall Ranking
  const overallSheet = workbook.addWorksheet("Overall");
  overallSheet.columns = [
    { header: "Rank", key: "rank", width: 8 },
    { header: "Team", key: "teamName", width: 30 },
    { header: "Score", key: "score", width: 12 },
    { header: "Judges", key: "judgeCount", width: 10 },
    { header: "Track", key: "trackName", width: 20 },
  ];
  overallSheet.getRow(1).font = { bold: true };
  data.overallRanking.forEach((team, idx) => {
    overallSheet.addRow({
      rank: idx + 1,
      teamName: team.teamName,
      score: team.score ?? "N/A",
      judgeCount: team.judgeCount,
      trackName: team.trackName ?? "Overall",
    });
  });

  // Sheet 2: Track Rankings
  for (const [trackId, teams] of Object.entries(data.trackRankings)) {
    const trackName = trackId === "overall" ? "Overall" : (teams as any[])[0]?.trackName ?? trackId;
    const sheet = workbook.addWorksheet(trackName.substring(0, 31)); // Excel sheet name max 31 chars
    sheet.columns = [
      { header: "Rank", key: "rank", width: 8 },
      { header: "Team", key: "teamName", width: 30 },
      { header: "Score", key: "score", width: 12 },
      { header: "Judges", key: "judgeCount", width: 10 },
    ];
    sheet.getRow(1).font = { bold: true };
    (teams as any[]).forEach((team: any, idx: number) => {
      sheet.addRow({
        rank: idx + 1,
        teamName: team.teamName,
        score: team.score ?? "N/A",
        judgeCount: team.judgeCount,
      });
    });
  }

  // Sheet 3: Detailed Scores with criteria breakdown
  const detailSheet = workbook.addWorksheet("Detailed");
  const criteriaNames = data.teams[0]?.criteriaBreakdown.map((c: any) => c.criterionName) ?? [];
  detailSheet.columns = [
    { header: "Team", key: "teamName", width: 30 },
    ...criteriaNames.map((name: string) => ({ header: name, key: name, width: 15 })),
    { header: "Total Score", key: "totalScore", width: 12 },
    { header: "Judges", key: "judgeCount", width: 10 },
  ];
  detailSheet.getRow(1).font = { bold: true };
  for (const team of data.teams) {
    const row: Record<string, any> = {
      teamName: team.teamName,
      totalScore: team.score ?? "N/A",
      judgeCount: team.judgeCount,
    };
    for (const crit of team.criteriaBreakdown) {
      row[crit.criterionName] = Math.round(crit.weightedScore * 100) / 100;
    }
    detailSheet.addRow(row);
  }

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.slug}-results.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
