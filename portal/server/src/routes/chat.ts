import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createAlerts, truncate } from "../alerts.js";
import { db } from "../db.js";

export const chatRouter = Router({ mergeParams: true });

const messageInput = z.object({
  author: z.string().min(1),
  body: z.string().min(1),
  notify: z.array(z.string()).optional(),
});

chatRouter.get<{ leadId: string }>("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM chat_messages WHERE lead_id = ? ORDER BY created_at ASC")
    .all(req.params.leadId);
  res.json(rows);
});

chatRouter.post<{ leadId: string }>("/", (req, res) => {
  const parsed = messageInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = nanoid();
  const created_at = new Date().toISOString();
  db.prepare(
    `INSERT INTO chat_messages (id, lead_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, req.params.leadId, parsed.data.author, parsed.data.body, created_at);

  if (parsed.data.notify?.length) {
    createAlerts({
      leadId: req.params.leadId,
      sourceType: "chat",
      sourceId: id,
      message: `${parsed.data.author} replied: "${truncate(parsed.data.body)}"`,
      createdBy: parsed.data.author,
      recipients: parsed.data.notify,
    });
  }

  const row = db.prepare("SELECT * FROM chat_messages WHERE id = ?").get(id);
  res.status(201).json(row);
});
