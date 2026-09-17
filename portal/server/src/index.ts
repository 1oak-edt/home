import cors from "cors";
import express from "express";
import "./db.js";
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

app.use("/api/leads/:leadId/comments", commentsRouter);
app.use("/api/leads/:leadId/chat", chatRouter);
app.use("/api/leads/:leadId/tasks", tasksRouter);
app.use("/api/leads/:leadId/documents", documentsRouter);
app.use("/api/leads/:leadId/exec-summary", execSummaryRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/alerts", alertsRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`1Oak Tracker API listening on http://localhost:${PORT}`);
});
