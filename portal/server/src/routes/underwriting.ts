import { Router } from "express";
import { z } from "zod";
import { ah } from "../asyncHandler.js";
import { db } from "../firebaseAdmin.js";

export const underwritingRouter = Router({ mergeParams: true });

// The model is owned by the client; the server only persists it, so validate shape and size, not each field.
const underwritingInput = z
  .object({
    version: z.literal(1),
    mix: z.array(z.unknown()).max(50),
    saleComps: z.array(z.unknown()).max(200),
    rentComps: z.array(z.unknown()).max(200),
    uses: z.array(z.unknown()).max(50),
  })
  .passthrough();

function underwritingDoc(leadId: string) {
  return db.collection("leads").doc(leadId).collection("underwriting").doc("main");
}

underwritingRouter.get<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const snap = await underwritingDoc(req.params.leadId).get();
    if (!snap.exists) return res.json({ data: null, updated_at: null, updated_by: null });
    const doc = snap.data() as { data: unknown; updated_at: string; updated_by: string | null };
    res.json(doc);
  })
);

underwritingRouter.put<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const leadSnap = await db.collection("leads").doc(req.params.leadId).get();
    if (!leadSnap.exists) return res.status(404).json({ error: "Lead not found" });

    const parsed = underwritingInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const doc = {
      data: parsed.data,
      updated_at: new Date().toISOString(),
      updated_by: req.user?.name ?? null,
    };
    await underwritingDoc(req.params.leadId).set(doc);
    res.json(doc);
  })
);
