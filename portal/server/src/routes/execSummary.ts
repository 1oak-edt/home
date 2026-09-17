import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import { extractHighlights } from "../ai.js";
import { db, execSummariesDir } from "../db.js";

export const execSummaryRouter = Router({ mergeParams: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

execSummaryRouter.post<{ leadId: string }>("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const leadId = req.params.leadId;
  const existing = db.prepare("SELECT id FROM leads WHERE id = ?").get(leadId);
  if (!existing) return res.status(404).json({ error: "Lead not found" });

  const dir = path.join(execSummariesDir, leadId);
  fs.mkdirSync(dir, { recursive: true });
  const storedName = `summary${path.extname(req.file.originalname) || ".pdf"}`;
  fs.writeFileSync(path.join(dir, storedName), req.file.buffer);

  let text = "";
  try {
    const parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    text = result.text ?? "";
  } catch {
    text = "";
  }

  const highlights = await extractHighlights(text, req.file.originalname);
  const uploaded_at = new Date().toISOString();

  db.prepare(
    `UPDATE leads SET exec_summary_filename = ?, exec_summary_highlights = ?, exec_summary_uploaded_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(req.file.originalname, JSON.stringify(highlights), uploaded_at, uploaded_at, leadId);

  res.status(201).json({ filename: req.file.originalname, highlights, uploaded_at });
});

execSummaryRouter.get<{ leadId: string }>("/file", (req, res) => {
  const leadId = req.params.leadId;
  const lead = db.prepare("SELECT exec_summary_filename FROM leads WHERE id = ?").get(leadId) as
    | { exec_summary_filename: string | null }
    | undefined;
  if (!lead?.exec_summary_filename) return res.status(404).json({ error: "No summary uploaded" });

  const dir = path.join(execSummariesDir, leadId);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const stored = files.find((f) => f.startsWith("summary"));
  if (!stored) return res.status(404).json({ error: "File missing on disk" });
  res.download(path.join(dir, stored), lead.exec_summary_filename);
});
