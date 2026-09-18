import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import { extractHighlights } from "../ai.js";
import { ah } from "../asyncHandler.js";
import { bucket, db } from "../firebaseAdmin.js";

export const execSummaryRouter = Router({ mergeParams: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function summaryPath(leadId: string, ext: string) {
  return `exec-summaries/${leadId}/summary${ext}`;
}

execSummaryRouter.post<{ leadId: string }>(
  "/",
  upload.single("file"),
  ah<{ leadId: string }>(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const leadId = req.params.leadId;
    const leadRef = db.collection("leads").doc(leadId);
    const existing = await leadRef.get();
    if (!existing.exists) return res.status(404).json({ error: "Lead not found" });

    const ext = path.extname(req.file.originalname) || ".pdf";
    await bucket.file(summaryPath(leadId, ext)).save(req.file.buffer, { contentType: "application/pdf" });

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

    await leadRef.update({
      exec_summary_filename: req.file.originalname,
      exec_summary_highlights: highlights,
      exec_summary_uploaded_at: uploaded_at,
      updated_at: uploaded_at,
    });

    res.status(201).json({ filename: req.file.originalname, highlights, uploaded_at });
  })
);

execSummaryRouter.get<{ leadId: string }>(
  "/file",
  ah<{ leadId: string }>(async (req, res) => {
    const leadId = req.params.leadId;
    const leadSnap = await db.collection("leads").doc(leadId).get();
    const filename = leadSnap.data()?.exec_summary_filename as string | undefined;
    if (!filename) return res.status(404).json({ error: "No summary uploaded" });

    const ext = path.extname(filename) || ".pdf";
    const file = bucket.file(summaryPath(leadId, ext));
    const [exists] = await file.exists();
    if (!exists) return res.status(404).json({ error: "File missing in storage" });

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    file.createReadStream().on("error", () => res.status(500).end()).pipe(res);
  })
);
