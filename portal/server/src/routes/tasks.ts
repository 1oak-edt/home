import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createAlerts } from "../alerts.js";
import { ah } from "../asyncHandler.js";
import { db } from "../firebaseAdmin.js";
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

function leadTasks(leadId: string) {
  return db.collection("leads").doc(leadId).collection("tasks");
}

tasksRouter.get<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const snap = await leadTasks(req.params.leadId).orderBy("created_at", "asc").get();
    res.json(snap.docs.map((d) => ({ id: d.id, lead_id: req.params.leadId, ...d.data() })));
  })
);

tasksRouter.post<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const parsed = taskInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const id = nanoid();
    const created_at = new Date().toISOString();
    const task = {
      title: parsed.data.title,
      assignee: parsed.data.assignee ?? null,
      status: "Open",
      created_at,
      completed_at: null,
    };
    await leadTasks(req.params.leadId).doc(id).set(task);

    if (parsed.data.notify?.length) {
      await createAlerts({
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

    res.status(201).json({ id, lead_id: req.params.leadId, ...task });
  })
);

tasksRouter.patch<{ leadId: string; taskId: string }>(
  "/:taskId",
  ah<{ leadId: string; taskId: string }>(async (req, res) => {
    const ref = leadTasks(req.params.leadId).doc(req.params.taskId);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: "Task not found" });

    const parsed = taskUpdateInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existingData = existing.data() as { completed_at: string | null };
    const update: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === "Done") {
      update.completed_at = existingData.completed_at ?? new Date().toISOString();
    } else if (parsed.data.status === "Open") {
      update.completed_at = null;
    }

    await ref.update(update);
    const updated = await ref.get();
    res.json({ id: updated.id, lead_id: req.params.leadId, ...updated.data() });
  })
);

tasksRouter.delete<{ leadId: string; taskId: string }>(
  "/:taskId",
  ah<{ leadId: string; taskId: string }>(async (req, res) => {
    const ref = leadTasks(req.params.leadId).doc(req.params.taskId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Task not found" });
    await ref.delete();
    res.status(204).send();
  })
);
