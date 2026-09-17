import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createAlerts, truncate } from "../alerts.js";
import { db } from "../db.js";

export const commentsRouter = Router({ mergeParams: true });

const commentInput = z.object({
  author: z.string().min(1),
  body: z.string().min(1),
  notify: z.array(z.string()).optional(),
});

commentsRouter.get<{ leadId: string }>("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM comments WHERE lead_id = ? ORDER BY created_at ASC")
    .all(req.params.leadId);
  res.json(rows);
});

commentsRouter.post<{ leadId: string }>("/", (req, res) => {
  const parsed = commentInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = nanoid();
  const created_at = new Date().toISOString();
  db.prepare(
    `INSERT INTO comments (id, lead_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, req.params.leadId, parsed.data.author, parsed.data.body, created_at);

  if (parsed.data.notify?.length) {
    createAlerts({
      leadId: req.params.leadId,
      sourceType: "comment",
      sourceId: id,
      message: `${parsed.data.author} commented: "${truncate(parsed.data.body)}"`,
      createdBy: parsed.data.author,
      recipients: parsed.data.notify,
    });
  }

  const row = db.prepare("SELECT * FROM comments WHERE id = ?").get(id);
  res.status(201).json(row);
});

commentsRouter.delete<{ leadId: string; commentId: string }>("/:commentId", (req, res) => {
  const result = db
    .prepare("DELETE FROM comments WHERE id = ? AND lead_id = ?")
    .run(req.params.commentId, req.params.leadId);
  if (result.changes === 0) return res.status(404).json({ error: "Comment not found" });
  res.status(204).send();
});
