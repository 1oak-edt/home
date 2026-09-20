import { Router } from "express";
import { z } from "zod";
import { ah } from "../asyncHandler.js";
import { db } from "../firebaseAdmin.js";

export const termSheetRouter = Router({ mergeParams: true });

// The client owns the term sheet's field list; the server stores the filled-in values and validates only shape and size.
const termSheetInput = z.object({
  version: z.literal(1),
  values: z
    .record(z.string().max(80), z.string().max(6000))
    .refine((v) => Object.keys(v).length <= 150, "Too many fields"),
  guarantors: z.array(z.string().max(200)).max(10),
  includeExtension: z.boolean(),
  includeHoldback: z.boolean(),
});

function termSheetDoc(leadId: string) {
  return db.collection("leads").doc(leadId).collection("termSheet").doc("main");
}

termSheetRouter.get<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const snap = await termSheetDoc(req.params.leadId).get();
    if (!snap.exists) return res.json({ data: null, updated_at: null, updated_by: null });
    res.json(snap.data());
  })
);

termSheetRouter.put<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const leadSnap = await db.collection("leads").doc(req.params.leadId).get();
    if (!leadSnap.exists) return res.status(404).json({ error: "Lead not found" });

    const parsed = termSheetInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const doc = {
      data: parsed.data,
      updated_at: new Date().toISOString(),
      updated_by: req.user?.name ?? null,
    };
    await termSheetDoc(req.params.leadId).set(doc);
    res.json(doc);
  })
);
