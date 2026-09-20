import { Router } from "express";
import { z } from "zod";
import { ah } from "../asyncHandler.js";
import { db } from "../firebaseAdmin.js";

export const escrowChecklistRouter = Router({ mergeParams: true });

// The checklist's task list lives in the client; the server stores only per-item state, keyed by item id.
const itemId = z.string().regex(/^[a-z0-9-]{1,80}$/);

const itemPatch = z
  .object({
    received: z.boolean().optional(),
    na: z.boolean().optional(),
    docIds: z.array(z.string().min(1).max(64)).max(25).optional(),
  })
  .strict();

const patchInput = z.object({
  updates: z
    .record(itemId, itemPatch)
    .refine((u) => Object.keys(u).length > 0 && Object.keys(u).length <= 100, "Between 1 and 100 items per request"),
});

function checklistDoc(leadId: string) {
  return db.collection("leads").doc(leadId).collection("escrowChecklist").doc("main");
}

escrowChecklistRouter.get<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const snap = await checklistDoc(req.params.leadId).get();
    if (!snap.exists) return res.json({ items: {}, updated_at: null, updated_by: null });
    res.json(snap.data());
  })
);

// Merge per item (not whole-document replace) so two people ticking different tasks never overwrite each other.
escrowChecklistRouter.patch<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const leadSnap = await db.collection("leads").doc(req.params.leadId).get();
    if (!leadSnap.exists) return res.status(404).json({ error: "Lead not found" });

    const parsed = patchInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const now = new Date().toISOString();
    const by = req.user?.name ?? null;
    const items: Record<string, Record<string, unknown>> = {};
    for (const [id, patch] of Object.entries(parsed.data.updates)) {
      const fields: Record<string, unknown> = { ...patch };
      if (patch.received === true) {
        fields.received_at = now;
        fields.received_by = by;
      } else if (patch.received === false) {
        fields.received_at = null;
        fields.received_by = null;
      }
      items[id] = fields;
    }

    await checklistDoc(req.params.leadId).set({ items, updated_at: now, updated_by: by }, { merge: true });
    const updated = await checklistDoc(req.params.leadId).get();
    res.json(updated.data());
  })
);
