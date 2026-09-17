import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { createAlerts } from "../alerts.js";
import { db, uploadsDir } from "../db.js";
import { DOCUMENT_CATEGORIES } from "../types.js";

export const documentsRouter = Router({ mergeParams: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function categorySlug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

documentsRouter.get<{ leadId: string }>("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM documents WHERE lead_id = ? ORDER BY created_at DESC")
    .all(req.params.leadId);
  res.json(rows);
});

documentsRouter.post<{ leadId: string }>("/", upload.single("file"), (req, res) => {
  const category = req.body.category;
  const uploadedBy = req.body.uploaded_by ?? null;
  if (!(DOCUMENT_CATEGORIES as readonly string[]).includes(category)) {
    return res.status(400).json({ error: "Invalid category" });
  }
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const id = nanoid();
  const ext = path.extname(req.file.originalname) || "";
  const storedName = `${id}${ext}`;
  const dir = path.join(uploadsDir, req.params.leadId, categorySlug(category));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, storedName), req.file.buffer);

  const created_at = new Date().toISOString();
  db.prepare(
    `INSERT INTO documents (id, lead_id, category, original_name, stored_name, size, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.params.leadId, category, req.file.originalname, storedName, req.file.size, uploadedBy, created_at);

  let notify: string[] = [];
  try {
    notify = req.body.notify ? JSON.parse(req.body.notify) : [];
  } catch {
    notify = [];
  }
  if (notify.length) {
    createAlerts({
      leadId: req.params.leadId,
      sourceType: "document",
      sourceId: id,
      message: `${uploadedBy ?? "Someone"} uploaded "${req.file.originalname}" to ${category}`,
      createdBy: uploadedBy,
      recipients: notify,
    });
  }

  const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  res.status(201).json(row);
});

documentsRouter.get<{ leadId: string; docId: string }>("/:docId/download", (req, res) => {
  const doc = db
    .prepare("SELECT * FROM documents WHERE id = ? AND lead_id = ?")
    .get(req.params.docId, req.params.leadId) as Record<string, any> | undefined;
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const filePath = path.join(uploadsDir, req.params.leadId, categorySlug(doc.category), doc.stored_name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File missing on disk" });
  res.download(filePath, doc.original_name);
});

documentsRouter.delete<{ leadId: string; docId: string }>("/:docId", (req, res) => {
  const doc = db
    .prepare("SELECT * FROM documents WHERE id = ? AND lead_id = ?")
    .get(req.params.docId, req.params.leadId) as Record<string, any> | undefined;
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const filePath = path.join(uploadsDir, req.params.leadId, categorySlug(doc.category), doc.stored_name);
  fs.rm(filePath, { force: true }, () => {});
  db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.docId);
  res.status(204).send();
});
