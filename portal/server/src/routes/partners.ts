import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import { z } from "zod";
import { ah } from "../asyncHandler.js";
import { db } from "../firebaseAdmin.js";
import { PARTNER_TYPES } from "../types.js";

export const partnersRouter = Router();

const short = (max: number) => z.string().trim().max(max);

const partnerFields = {
  contact_name: short(120).min(1),
  preferred_name: short(60),
  company: short(160),
  type: z.enum(PARTNER_TYPES),
  email: z.union([z.literal(""), short(200).email()]),
  phone: short(80),
  market: short(120),
  specialty: short(120),
  notes: short(5000),
};

const partnerInput = z.object({
  contact_name: partnerFields.contact_name,
  preferred_name: partnerFields.preferred_name.default(""),
  company: partnerFields.company.default(""),
  type: partnerFields.type.default("CRE"),
  email: partnerFields.email.default(""),
  phone: partnerFields.phone.default(""),
  market: partnerFields.market.default(""),
  specialty: partnerFields.specialty.default(""),
  notes: partnerFields.notes.default(""),
});

const partnerUpdate = z.object(partnerFields).partial().strict();

const linkInput = z.object({ leadId: z.string().min(1).max(64) });

const partners = () => db.collection("partners");

async function respondWithPartner(id: string, res: import("express").Response) {
  const snap = await partners().doc(id).get();
  res.json({ id: snap.id, ...snap.data() });
}

partnersRouter.get(
  "/",
  ah(async (_req, res) => {
    const snap = await partners().get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  })
);

partnersRouter.post(
  "/",
  ah(async (req, res) => {
    const parsed = partnerInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const id = nanoid();
    const now = new Date().toISOString();
    await partners().doc(id).set({ ...parsed.data, deal_ids: [], created_at: now, updated_at: now });
    res.status(201);
    await respondWithPartner(id, res);
  })
);

partnersRouter.patch<{ id: string }>(
  "/:id",
  ah<{ id: string }>(async (req, res) => {
    const ref = partners().doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Partner not found" });

    const parsed = partnerUpdate.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    await ref.update({ ...parsed.data, updated_at: new Date().toISOString() });
    await respondWithPartner(req.params.id, res);
  })
);

partnersRouter.delete<{ id: string }>(
  "/:id",
  ah<{ id: string }>(async (req, res) => {
    const ref = partners().doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Partner not found" });
    await ref.delete();
    res.status(204).send();
  })
);

// arrayUnion/arrayRemove change only the one deal, so simultaneous edits by different people don't clobber each other.
partnersRouter.post<{ id: string }>(
  "/:id/deals",
  ah<{ id: string }>(async (req, res) => {
    const ref = partners().doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Partner not found" });

    const parsed = linkInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (!(await db.collection("leads").doc(parsed.data.leadId).get()).exists) {
      return res.status(404).json({ error: "Deal not found" });
    }

    await ref.update({ deal_ids: FieldValue.arrayUnion(parsed.data.leadId), updated_at: new Date().toISOString() });
    await respondWithPartner(req.params.id, res);
  })
);

partnersRouter.delete<{ id: string; leadId: string }>(
  "/:id/deals/:leadId",
  ah<{ id: string; leadId: string }>(async (req, res) => {
    const ref = partners().doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Partner not found" });

    await ref.update({ deal_ids: FieldValue.arrayRemove(req.params.leadId), updated_at: new Date().toISOString() });
    await respondWithPartner(req.params.id, res);
  })
);
