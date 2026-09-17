import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "../db.js";
import { ALL_STAGES, ASSET_CLASSES, LOAN_TYPES, type Lead, type Stage } from "../types.js";

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

function rowToLead(row: any): Lead {
  return {
    ...row,
    sponsor_names: row.sponsor_names ? JSON.parse(row.sponsor_names) : [],
    use_of_proceeds: row.use_of_proceeds ? JSON.parse(row.use_of_proceeds) : [],
    exec_summary_highlights: row.exec_summary_highlights ? JSON.parse(row.exec_summary_highlights) : [],
  } as Lead;
}

leadsRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM leads ORDER BY updated_at DESC").all();
  res.json(rows.map(rowToLead));
});

leadsRouter.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Lead not found" });
  res.json(rowToLead(row));
});

leadsRouter.get("/:id/history", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM stage_history WHERE lead_id = ? ORDER BY created_at ASC")
    .all(req.params.id);
  res.json(rows);
});

leadsRouter.post("/", (req, res) => {
  const parsed = leadInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const id = nanoid();
  const ts = now();
  const data = parsed.data;
  db.prepare(
    `INSERT INTO leads (
      id, borrower_name, contact_name, contact_email, contact_phone,
      property_address, city, state, asset_class, loan_type, loan_amount,
      purchase_price, equity_contribution, interest_rate, term_months,
      exit_strategy, sponsor_names, use_of_proceeds, latitude, longitude,
      stage, prior_stage, lost_reason, source, assigned_to, expected_close_date,
      notes, created_at, updated_at, stage_changed_at
    ) VALUES (
      @id, @borrower_name, @contact_name, @contact_email, @contact_phone,
      @property_address, @city, @state, @asset_class, @loan_type, @loan_amount,
      @purchase_price, @equity_contribution, @interest_rate, @term_months,
      @exit_strategy, @sponsor_names, @use_of_proceeds, @latitude, @longitude,
      'Intake', NULL, NULL, @source, @assigned_to, @expected_close_date,
      @notes, @created_at, @updated_at, @stage_changed_at
    )`
  ).run({
    id,
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
    sponsor_names: JSON.stringify(data.sponsor_names ?? []),
    use_of_proceeds: JSON.stringify(data.use_of_proceeds ?? []),
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    source: data.source ?? null,
    assigned_to: data.assigned_to ?? null,
    expected_close_date: data.expected_close_date ?? null,
    notes: data.notes ?? null,
    created_at: ts,
    updated_at: ts,
    stage_changed_at: ts,
  });

  db.prepare(
    `INSERT INTO stage_history (id, lead_id, from_stage, to_stage, reason, created_at)
     VALUES (?, ?, NULL, 'Intake', NULL, ?)`
  ).run(nanoid(), id, ts);

  const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(id);
  res.status(201).json(rowToLead(row));
});

leadsRouter.patch("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id) as
    | Record<string, any>
    | undefined;
  if (!existing) return res.status(404).json({ error: "Lead not found" });

  const partial = leadInput.partial().safeParse(req.body);
  if (!partial.success) {
    return res.status(400).json({ error: partial.error.flatten() });
  }
  const data = partial.data;
  const ts = now();

  const merged = {
    ...existing,
    ...data,
    sponsor_names: JSON.stringify(
      data.sponsor_names ?? (existing.sponsor_names ? JSON.parse(existing.sponsor_names) : [])
    ),
    use_of_proceeds: JSON.stringify(
      data.use_of_proceeds ?? (existing.use_of_proceeds ? JSON.parse(existing.use_of_proceeds) : [])
    ),
    updated_at: ts,
  };
  const updateParams: Record<string, unknown> = {
    id: req.params.id,
    borrower_name: merged.borrower_name,
    contact_name: merged.contact_name,
    contact_email: merged.contact_email,
    contact_phone: merged.contact_phone,
    property_address: merged.property_address,
    city: merged.city,
    state: merged.state,
    asset_class: merged.asset_class,
    loan_type: merged.loan_type,
    loan_amount: merged.loan_amount,
    purchase_price: merged.purchase_price,
    equity_contribution: merged.equity_contribution,
    interest_rate: merged.interest_rate,
    term_months: merged.term_months,
    exit_strategy: merged.exit_strategy,
    sponsor_names: merged.sponsor_names,
    use_of_proceeds: merged.use_of_proceeds,
    latitude: merged.latitude,
    longitude: merged.longitude,
    source: merged.source,
    assigned_to: merged.assigned_to,
    expected_close_date: merged.expected_close_date,
    notes: merged.notes,
    updated_at: merged.updated_at,
  };
  db.prepare(
    `UPDATE leads SET
      borrower_name = @borrower_name,
      contact_name = @contact_name,
      contact_email = @contact_email,
      contact_phone = @contact_phone,
      property_address = @property_address,
      city = @city,
      state = @state,
      asset_class = @asset_class,
      loan_type = @loan_type,
      loan_amount = @loan_amount,
      purchase_price = @purchase_price,
      equity_contribution = @equity_contribution,
      interest_rate = @interest_rate,
      term_months = @term_months,
      exit_strategy = @exit_strategy,
      sponsor_names = @sponsor_names,
      use_of_proceeds = @use_of_proceeds,
      latitude = @latitude,
      longitude = @longitude,
      source = @source,
      assigned_to = @assigned_to,
      expected_close_date = @expected_close_date,
      notes = @notes,
      updated_at = @updated_at
    WHERE id = @id`
  ).run(updateParams as any);

  const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  res.json(rowToLead(row));
});

const stageChangeSchema = z.object({
  stage: z.enum(ALL_STAGES),
  reason: z.string().optional().nullable(),
});

leadsRouter.post("/:id/stage", (req, res) => {
  const existing = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id) as
    | Lead
    | undefined;
  if (!existing) return res.status(404).json({ error: "Lead not found" });

  const parsed = stageChangeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { stage, reason } = parsed.data;
  const ts = now();
  const isClosing = stage === "Disqualified" || stage === "Lost";
  const wasClosed = existing.stage === "Disqualified" || existing.stage === "Lost";

  db.prepare(
    `UPDATE leads SET
      stage = @stage,
      prior_stage = @prior_stage,
      lost_reason = @lost_reason,
      updated_at = @updated_at,
      stage_changed_at = @stage_changed_at
    WHERE id = @id`
  ).run({
    id: req.params.id,
    stage,
    prior_stage: isClosing ? existing.stage : wasClosed ? null : existing.prior_stage,
    lost_reason: isClosing ? reason ?? null : null,
    updated_at: ts,
    stage_changed_at: ts,
  });

  db.prepare(
    `INSERT INTO stage_history (id, lead_id, from_stage, to_stage, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(nanoid(), req.params.id, existing.stage, stage, reason ?? null, ts);

  const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  res.json(rowToLead(row));
});

leadsRouter.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM leads WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Lead not found" });
  res.status(204).send();
});
