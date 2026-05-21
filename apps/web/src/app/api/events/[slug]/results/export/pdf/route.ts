import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@hackjudge/db";
import { requireAuth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  requireAuth(req);
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return apiError("EVENT_NOT_FOUND", "Event not found", null, 404);
  const snapshot = await prisma.resultSnapshot.findFirst({ where: { eventId: event.id }, orderBy: { generatedAt: "desc" } });
  if (!snapshot) return apiError("RESULTS_NOT_FOUND", "No results generated yet", null, 404);

  const data = snapshot.data as any;
  const config = event.configJson as any;
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const winningTeams: any[] = [];
  if (data.overallRanking[0]) winningTeams.push({ ...data.overallRanking[0], title: "Winner — Overall" });
  for (const [, teams] of Object.entries(data.trackRankings)) {
    const ranked = (teams as any[]).filter((t: any) => t.score !== null);
    if (ranked[0]) winningTeams.push({ ...ranked[0], title: `1st Place — ${ranked[0].trackName ?? "Track"}` });
  }

  for (let i = 0; i < winningTeams.length; i++) {
    if (i > 0) doc.addPage();
    const team = winningTeams[i];
    doc.fontSize(28).text(team.title, 50, 100);
    doc.fontSize(36).text(team.teamName, 50, 160);
    doc.fontSize(14).text(`Event: ${config.event.name}`, 50, 240);
    doc.fontSize(14).text(`Date: ${new Date().toDateString()}`, 50, 270);
    doc.fontSize(12).text(`Certificate ID: ${crypto.randomUUID()}`, 50, 350);
    doc.fontSize(10).text("HackJudge", 50, 700);
  }

  doc.end();

  return new Promise<Response>((resolve) => {
    doc.on("end", () => {
      const buf = Buffer.concat(chunks);
      resolve(new Response(buf, {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${params.slug}-certificates.pdf"` },
      }));
    });
  });
}
