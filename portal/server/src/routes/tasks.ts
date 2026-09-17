import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createAlerts } from "../alerts.js";
import { db } from "../db.js";
import { TASK_STATUSES } from "../types.js";

export const tasksRouter = Router({ mergeParams: true });

const taskInput = z.object({
  title: z.string().min(1),
  assignee: z.string().optional().nullable(),
  created_by: z.string().optional().nullable(),
  notify: z.array(z.string()).optional(),
});

const taskUpdateInput = z.object({
  title: z.string().min(1).optional(),
  assignee: z.string().optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
});

tasksRouter.get<{ leadId: string }>("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM tasks WHERE lead_id = ? ORDER BY created_at ASC")
    .all(req.params.leadId);
  res.json(rows);
});

tasksRouter.post<{ leadId: string }>("/", (req, res) => {
  const parsed = taskInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = nanoid();
  const created_at = new Date().toISOString();
  db.prepare(
    `INSERT INTO tasks (id, lead_id, title, assignee, status, created_at, completed_at)
     VALUES (?, ?, ?, ?, 'Open', ?, NULL)`
  ).run(id, req.params.leadId, parsed.data.title, parsed.data.assignee ?? null, created_at);

  if (parsed.data.notify?.length) {
    createAlerts({
      leadId: req.params.leadId,
      sourceType: "task",
      sourceId: id,
      message: `${parsed.data.created_by ?? "Someone"} added a task: "${parsed.data.title}"${
        parsed.data.assignee ? ` (assigned to ${parsed.data.assignee})` : ""
      }`,
      createdBy: parsed.data.created_by ?? null,
      recipients: parsed.data.notify,
    });
  }

  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  res.status(201).json(row);
});

tasksRouter.patch<{ leadId: string; taskId: string }>("/:taskId", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND lead_id = ?")
    .get(req.params.taskId, req.params.leadId) as Record<string, any> | undefined;
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const parsed = taskUpdateInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const merged = { ...existing, ...parsed.data };
  const completed_at =
    parsed.data.status === "Done"
      ? existing.completed_at ?? new Date().toISOString()
      : parsed.data.status === "Open"
        ? null
        : existing.completed_at;

  const updateParams: Record<string, unknown> = {
    title: merged.title,
    assignee: merged.assignee,
    status: merged.status,
    completed_at,
    id: req.params.taskId,
  };
  db.prepare(
    `UPDATE tasks SET title = @title, assignee = @assignee, status = @status, completed_at = @completed_at
     WHERE id = @id`
  ).run(updateParams as any);

  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.taskId);
  res.json(row);
});

tasksRouter.delete<{ leadId: string; taskId: string }>("/:taskId", (req, res) => {
  const result = db
    .prepare("DELETE FROM tasks WHERE id = ? AND lead_id = ?")
    .run(req.params.taskId, req.params.leadId);
  if (result.changes === 0) return res.status(404).json({ error: "Task not found" });
  res.status(204).send();
});
