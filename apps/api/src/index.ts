import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import { error } from "@hackjudge/shared";
import { prisma } from "@hackjudge/db";

import { setupWebSocket } from "./websocket.js";
import authRouter from "./routes/auth.js";
import eventsRouter from "./routes/events.js";
import judgesRouter from "./routes/judges.js";
import teamsRouter from "./routes/teams.js";
import scoresRouter from "./routes/scores.js";
import resultsRouter from "./routes/results.js";
import moderationRouter from "./routes/moderation.js";
import xlsxRouter from "./routes/xlsx.js";
import aiRouter from "./routes/ai.js";

dotenv.config();

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
});

setupWebSocket(io);

app.set("io", io);
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/events", eventsRouter);
app.use("/api/v1/events", judgesRouter);
app.use("/api/v1/events", teamsRouter);
app.use("/api/v1/events", scoresRouter);
app.use("/api/v1/events", resultsRouter);
app.use("/api/v1/events", moderationRouter);
app.use("/api/v1/events", xlsxRouter);
app.use("/api/v1/ai", aiRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// OpenAPI spec
app.get("/api/v1/openapi.yaml", (_req, res) => {
  res.sendFile("openapi.yaml", { root: process.cwd() });
});

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json(error("INTERNAL_ERROR", err.message));
  }
);

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";
httpServer.listen(PORT, HOST, () => {
  console.log(`API server running on http://${HOST}:${PORT}`);
});

function shutdown() {
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
