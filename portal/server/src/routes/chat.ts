import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createAlerts, deleteAlertsForSource, truncate } from "../alerts.js";
import { ah } from "../asyncHandler.js";
import { db } from "../firebaseAdmin.js";

export const chatRouter = Router({ mergeParams: true });

const messageInput = z.object({
  author: z.string().min(1),
  body: z.string().min(1),
  notify: z.array(z.string()).optional(),
});

function leadChat(leadId: string) {
  return db.collection("leads").doc(leadId).collection("chatMessages");
}

chatRouter.get<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const snap = await leadChat(req.params.leadId).orderBy("created_at", "asc").get();
    res.json(snap.docs.map((d) => ({ id: d.id, lead_id: req.params.leadId, ...d.data() })));
  })
);

chatRouter.post<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const parsed = messageInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const id = nanoid();
    const created_at = new Date().toISOString();
    const message = { author: parsed.data.author, body: parsed.data.body, created_at };
    await leadChat(req.params.leadId).doc(id).set(message);

    if (parsed.data.notify?.length) {
      await createAlerts({
        leadId: req.params.leadId,
        sourceType: "chat",
        sourceId: id,
        message: `${parsed.data.author} replied: "${truncate(parsed.data.body)}"`,
        createdBy: parsed.data.author,
        recipients: parsed.data.notify,
      });
    }

    res.status(201).json({ id, lead_id: req.params.leadId, ...message });
  })
);

chatRouter.delete<{ leadId: string; messageId: string }>(
  "/:messageId",
  ah<{ leadId: string; messageId: string }>(async (req, res) => {
    const ref = leadChat(req.params.leadId).doc(req.params.messageId);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Message not found" });
    await ref.delete();
    await deleteAlertsForSource(req.params.leadId, "chat", req.params.messageId);
    res.status(204).send();
  })
);
