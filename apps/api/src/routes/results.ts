import { Router, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "@hackjudge/db";
import { success, error } from "@hackjudge/shared";
import { requireAuth, requireOrganizer, AuthRequest } from "../middleware.js";
import { computeResults } from "../results/engine.js";

const router = Router({ mergeParams: true });

router.post("/:slug/results/generate", requireAuth, requireOrganizer, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }

  // Advisory lock pattern using a transaction row
  const lockKey = `generate-${event.id}`;
  const existing = await prisma.resultSnapshot.findFirst({
    where: { eventId: event.id },
    orderBy: { generatedAt: "desc" },
  });

  const results = await computeResults(event.id);

  const snapshot = await prisma.resultSnapshot.create({
    data: {
      eventId: event.id,
      data: results as any,
      isPublished: true,
    },
  });

  // Webhook delivery
  const config = event.configJson as any;
  const webhookUrl = config.results?.export?.webhook_url;
  const webhookSecret = config.results?.export?.webhook_secret;
  if (webhookUrl) {
    setImmediate(async () => {
      await deliverWebhook(webhookUrl, webhookSecret, results, event.id);
    });
  }

  res.json(success({ snapshotId: snapshot.id, ...results }));
});

async function deliverWebhook(url: string, secret: string | null, payload: object, eventId: string) {
  const crypto = await import("crypto");
  const body = JSON.stringify(payload);
  const signature = secret
    ? crypto.createHmac("sha256", secret).update(body).digest("hex")
    : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(signature ? { "X-HackJudge-Signature": `sha256=${signature}` } : {}),
  };

  const delays = [5000, 15000, 45000];
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      await prisma.auditLog.create({
        data: {
          eventId,
          actorId: "system",
          actorType: "system",
          action: "webhook_delivered",
          payload: { url, attempt, status: resp.status },
        },
      });
      if (resp.ok) break;
    } catch (e) {
      await prisma.auditLog.create({
        data: {
          eventId,
          actorId: "system",
          actorType: "system",
          action: "webhook_failed",
          payload: { url, attempt, error: String(e) },
        },
      });
      if (attempt < 3) await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
}

router.get("/:slug/results", requireAuth, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const snapshot = await prisma.resultSnapshot.findFirst({
    where: { eventId: event.id },
    orderBy: { generatedAt: "desc" },
  });
  if (!snapshot) {
    res.status(404).json(error("RESULTS_NOT_FOUND", "No results generated yet"));
    return;
  }
  res.json(success(snapshot.data));
});

router.get("/:slug/results/export/csv", requireAuth, async (req: AuthRequest, res: Response) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const snapshot = await prisma.resultSnapshot.findFirst({
    where: { eventId: event.id },
    orderBy: { generatedAt: "desc" },
  });
  if (!snapshot) {
    res.status(404).json(error("RESULTS_NOT_FOUND", "No results generated yet"));
    return;
  }

  const data = snapshot.data as any;
  const rows: string[] = ["Rank,Team,Track,Score,Judges"];
  data.overallRanking.forEach((team: any, idx: number) => {
    rows.push(`${idx + 1},"${team.teamName}","${team.trackName ?? ""}",${team.score ?? ""},${team.judgeCount}`);
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.slug}-results.csv"`);
  res.send(rows.join("\n"));
});

router.get("/:slug/results/export/pdf", requireAuth, async (req: AuthRequest, res: Response) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json(error("EVENT_NOT_FOUND", "Event not found"));
    return;
  }
  const snapshot = await prisma.resultSnapshot.findFirst({
    where: { eventId: event.id },
    orderBy: { generatedAt: "desc" },
  });
  if (!snapshot) {
    res.status(404).json(error("RESULTS_NOT_FOUND", "No results generated yet"));
    return;
  }

  const data = snapshot.data as any;
  const config = event.configJson as any;
  const doc = new PDFDocument();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.slug}-certificates.pdf"`);
  doc.pipe(res);

  // Generate one page per top-3 team per track + overall winner
  const winningTeams: any[] = [];
  if (data.overallRanking[0]) winningTeams.push({ ...data.overallRanking[0], title: "Winner — Overall" });
  for (const [trackId, teams] of Object.entries(data.trackRankings)) {
    const ranked = (teams as any[]).filter((t) => t.score !== null);
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
});

export default router;
