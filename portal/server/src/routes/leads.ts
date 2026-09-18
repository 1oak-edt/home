import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { ah } from "../asyncHandler.js";
import { db } from "../firebaseAdmin.js";
import { deleteLeadCascade } from "../firestoreHelpers.js";
import { ALL_STAGES, ASSET_CLASSES, LOAN_TYPES, type Lead } from "../types.js";

export const leadsRouter = Router();

const useOfProceedsItem = z.object({
  category: z.string().min(1),
  amount: z.number().nonnegative(),
});

const leadInput = z.object({
  borrower_name: z.string().min(1),
  contact_name: z.string().optional().nullable(),
  contact_email: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  property_address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  asset_class: z.enum(ASSET_CLASSES),
  loan_type: z.enum(LOAN_TYPES),
  loan_amount: z.number().nonnegative(),
  purchase_price: z.number().nonnegative().optional().nullable(),
  equity_contribution: z.number().nonnegative().optional().nullable(),
  interest_rate: z.number().optional().nullable(),
  term_months: z.number().int().nonnegative().optional().nullable(),
  exit_strategy: z.string().optional().nullable(),
  sponsor_names: z.array(z.string().min(1)).optional(),
  use_of_proceeds: z.array(useOfProceedsItem).optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  source: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  expected_close_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function now() {
  return new Date().toISOString();
}

function docToLead(id: string, data: any): Lead {
  return {
    id,
    sponsor_names: [],
    use_of_proceeds: [],
    exec_summary_highlights: [],
    ...data,
  } as Lead;
}

leadsRouter.get("/", ah(async (_req, res) => {
  const snap = await db.collection("leads").orderBy("updated_at", "desc").get();
  res.json(snap.docs.map((d) => docToLead(d.id, d.data())));
}));

leadsRouter.get("/:id", ah(async (req, res) => {
  const doc = await db.collection("leads").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: "Lead not found" });
  res.json(docToLead(doc.id, doc.data()));
}));

leadsRouter.get("/:id/history", ah(async (req, res) => {
  const snap = await db
    .collection("leads")
    .doc(req.params.id)
    .collection("stageHistory")
    .orderBy("created_at", "asc")
    .get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}));

leadsRouter.post("/", ah(async (req, res) => {
  const parsed = leadInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const id = nanoid();
  const ts = now();
  const data = parsed.data;

  const lead = {
    borrower_name: data.borrower_name,
    contact_name: data.contact_name ?? null,
    contact_email: data.contact_email ?? null,
    contact_phone: data.contact_phone ?? null,
    property_address: data.property_address ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    asset_class: data.asset_class,
    loan_type: data.loan_type,
    loan_amount: data.loan_amount,
    purchase_price: data.purchase_price ?? null,
    equity_contribution: data.equity_contribution ?? null,
    interest_rate: data.interest_rate ?? null,
    term_months: data.term_months ?? null,
    exit_strategy: data.exit_strategy ?? null,
    sponsor_names: data.sponsor_names ?? [],
    use_of_proceeds: data.use_of_proceeds ?? [],
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    exec_summary_filename: null,
    exec_summary_highlights: [],
    exec_summary_uploaded_at: null,
    stage: "Intake",
    prior_stage: null,
    lost_reason: null,
    source: data.source ?? null,
    assigned_to: data.assigned_to ?? null,
    expected_close_date: data.expected_close_date ?? null,
    notes: data.notes ?? null,
    created_at: ts,
    updated_at: ts,
    stage_changed_at: ts,
  };

  await db.collection("leads").doc(id).set(lead);
  await db.collection("leads").doc(id).collection("stageHistory").doc(nanoid()).set({
    from_stage: null,
    to_stage: "Intake",
    reason: null,
    created_at: ts,
  });

  res.status(201).json(docToLead(id, lead));
}));

leadsRouter.patch("/:id", ah(async (req, res) => {
  const ref = db.collection("leads").doc(req.params.id);
  const existing = await ref.get();
  if (!existing.exists) return res.status(404).json({ error: "Lead not found" });

  const partial = leadInput.partial().safeParse(req.body);
  if (!partial.success) {
    return res.status(400).json({ error: partial.error.flatten() });
  }

  const update = { ...partial.data, updated_at: now() };
  await ref.update(update);

  const updated = await ref.get();
  res.json(docToLead(updated.id, updated.data()));
}));

const stageChangeSchema = z.object({
  stage: z.enum(ALL_STAGES),
  reason: z.string().optional().nullable(),
});

leadsRouter.post("/:id/stage", ah(async (req, res) => {
  const ref = db.collection("leads").doc(req.params.id);
  const existing = await ref.get();
  if (!existing.exists) return res.status(404).json({ error: "Lead not found" });
  const existingData = existing.data() as Lead;

  const parsed = stageChangeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { stage, reason } = parsed.data;
  const ts = now();
  const isClosing = stage === "Disqualified" || stage === "Lost";
  const wasClosed = existingData.stage === "Disqualified" || existingData.stage === "Lost";

  await ref.update({
    stage,
    prior_stage: isClosing ? existingData.stage : wasClosed ? null : existingData.prior_stage ?? null,
    lost_reason: isClosing ? reason ?? null : null,
    updated_at: ts,
    stage_changed_at: ts,
  });

  await ref.collection("stageHistory").doc(nanoid()).set({
    from_stage: existingData.stage,
    to_stage: stage,
    reason: reason ?? null,
    created_at: ts,
  });

  const updated = await ref.get();
  res.json(docToLead(updated.id, updated.data()));
}));

leadsRouter.delete("/:id", ah(async (req, res) => {
  const ref = db.collection("leads").doc(req.params.id);
  const existing = await ref.get();
  if (!existing.exists) return res.status(404).json({ error: "Lead not found" });
  await deleteLeadCascade(req.params.id);
  res.status(204).send();
}));
