import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createAlerts, truncate } from "../alerts.js";
import { ah } from "../asyncHandler.js";
import { db } from "../firebaseAdmin.js";

export const commentsRouter = Router({ mergeParams: true });

const commentInput = z.object({
  author: z.string().min(1),
  body: z.string().min(1),
  notify: z.array(z.string()).optional(),
});

function leadComments(leadId: string) {
  return db.collection("leads").doc(leadId).collection("comments");
}

commentsRouter.get<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const snap = await leadComments(req.params.leadId).orderBy("created_at", "asc").get();
    res.json(snap.docs.map((d) => ({ id: d.id, lead_id: req.params.leadId, ...d.data() })));
  })
);

commentsRouter.post<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const parsed = commentInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const id = nanoid();
    const created_at = new Date().toISOString();
    const comment = { author: parsed.data.author, body: parsed.data.body, created_at };
    await leadComments(req.params.leadId).doc(id).set(comment);

    if (parsed.data.notify?.length) {
      await createAlerts({
        leadId: req.params.leadId,
        sourceType: "comment",
        sourceId: id,
        message: `${parsed.data.author} commented: "${truncate(parsed.data.body)}"`,
        createdBy: parsed.data.author,
        recipients: parsed.data.notify,
      });
    }

    res.status(201).json({ id, lead_id: req.params.leadId, ...comment });
  })
);

commentsRouter.delete<{ leadId: string; commentId: string }>(
  "/:commentId",
  ah<{ leadId: string; commentId: string }>(async (req, res) => {
    const ref = leadComments(req.params.leadId).doc(req.params.commentId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Comment not found" });
    await ref.delete();
    res.status(204).send();
  })
);
