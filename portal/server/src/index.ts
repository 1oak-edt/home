import cors from "cors";
import express from "express";
import "./firebaseAdmin.js";
import { requireAuth } from "./authMiddleware.js";
import { alertsRouter } from "./routes/alerts.js";
import { chatRouter } from "./routes/chat.js";
import { commentsRouter } from "./routes/comments.js";
import { documentsRouter } from "./routes/documents.js";
import { execSummaryRouter } from "./routes/execSummary.js";
import { leadsRouter } from "./routes/leads.js";
import { metricsRouter } from "./routes/metrics.js";
import { tasksRouter } from "./routes/tasks.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api", requireAuth);

app.use("/api/leads/:leadId/comments", commentsRouter);
app.use("/api/leads/:leadId/chat", chatRouter);
app.use("/api/leads/:leadId/tasks", tasksRouter);
app.use("/api/leads/:leadId/documents", documentsRouter);
app.use("/api/leads/:leadId/exec-summary", execSummaryRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/alerts", alertsRouter);

// Final error handler: any error forwarded via next(err) (including from the
// async route wrapper) lands here as a 500 instead of crashing the process.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`1Oak Tracker API listening on http://localhost:${PORT}`);
});
