import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";

export const alertsRouter = Router();

alertsRouter.get("/", (req, res) => {
  const user = String(req.query.user ?? "");
  if (!user) return res.status(400).json({ error: "user query param required" });
  const onlyUnread = req.query.unread === "true";

  const rows = db
    .prepare(
      `SELECT a.*, l.borrower_name FROM alerts a
       JOIN leads l ON l.id = a.lead_id
       WHERE a.recipient = ? ${onlyUnread ? "AND a.read_at IS NULL" : ""}
       ORDER BY a.created_at DESC
       LIMIT 100`
    )
    .all(user);
  res.json(rows);
});

alertsRouter.get("/unread-count", (req, res) => {
  const user = String(req.query.user ?? "");
  if (!user) return res.status(400).json({ error: "user query param required" });
  const row = db
    .prepare("SELECT COUNT(*) as count FROM alerts WHERE recipient = ? AND read_at IS NULL")
    .get(user) as { count: number };
  res.json({ count: row.count });
});

alertsRouter.post("/:id/read", (req, res) => {
  db.prepare("UPDATE alerts SET read_at = ? WHERE id = ?").run(new Date().toISOString(), req.params.id);
  res.status(204).send();
});

const readAllSchema = z.object({ user: z.string().min(1) });

alertsRouter.post("/read-all", (req, res) => {
  const parsed = readAllSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  db.prepare("UPDATE alerts SET read_at = ? WHERE recipient = ? AND read_at IS NULL").run(
    new Date().toISOString(),
    parsed.data.user
  );
  res.status(204).send();
});
