import { useEffect, useState } from "react";
import { api } from "../api";
import {
  ASSET_CLASSES,
  EXECUTIVES,
  EXIT_STRATEGIES,
  LOAN_TYPES,
  type Lead,
  type NewLeadInput,
  type UseOfProceedsItem,
} from "../types";
import { computeLtvLtc, formatPercent } from "../utils/format";
import { SponsorNamesInput } from "./SponsorNamesInput";
import { UseOfProceedsInput } from "./UseOfProceedsInput";

interface Props {
  lead: Lead;
  onUpdated: (lead: Lead) => void;
}

const inputCls =
  "w-full rounded-md border border-oak-line bg-white px-3 py-2 text-sm focus:border-oak-sage focus:outline-none";
const labelCls = "block text-[12px] font-medium uppercase tracking-wide text-oak-sage mb-1";
const TERM_UNITS = ["Months", "Years"] as const;

function termToForm(months: number | null) {
  if (months == null) return { value: "", unit: "Months" as (typeof TERM_UNITS)[number] };
  if (months % 12 === 0) return { value: String(months / 12), unit: "Years" as const };
  return { value: String(months), unit: "Months" as const };
}

export function DealOverviewForm({ lead, onUpdated }: Props) {
  const [form, setForm] = useState(() => buildForm(lead));
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setForm(buildForm(lead));
  }, [lead.id, lead.updated_at]);

  function buildForm(l: Lead) {
    const term = termToForm(l.term_months);
    return {
      borrower_name: l.borrower_name,
      contact_name: l.contact_name ?? "",
      contact_email: l.contact_email ?? "",
      contact_phone: l.contact_phone ?? "",
      property_address: l.property_address ?? "",
      city: l.city ?? "",
      state: l.state ?? "",
      asset_class: l.asset_class,
      loan_type: l.loan_type,
      loan_amount: String(l.loan_amount ?? ""),
      purchase_price: l.purchase_price != null ? String(l.purchase_price) : "",
      equity_contribution: l.equity_contribution != null ? String(l.equity_contribution) : "",
      interest_rate: l.interest_rate != null ? String(l.interest_rate) : "",
      rateTbd: l.interest_rate == null,
      termValue: term.value,
      termUnit: term.unit,
      exit_strategy: l.exit_strategy ?? "",
      source: l.source ?? "",
      assigned_to: l.assigned_to ?? "",
      notes: l.notes ?? "",
    };
  }

  function update<K extends keyof ReturnType<typeof buildForm>>(
    key: K,
    value: ReturnType<typeof buildForm>[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(patch: Partial<NewLeadInput>) {
    const updated = await api.updateLead(lead.id, patch);
    onUpdated(updated);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  function saveTextField(key: keyof NewLeadInput, raw: string) {
    const current = (lead as any)[key] ?? "";
    if (raw === current) return;
    save({ [key]: raw || null } as Partial<NewLeadInput>);
  }

  function saveNumberField(key: keyof NewLeadInput, raw: string) {
    const num = raw ? Number(raw) : null;
    const current = (lead as any)[key];
    if (num === current) return;
    save({ [key]: num } as Partial<NewLeadInput>);
  }

  function saveTerm(value: string, unit: (typeof TERM_UNITS)[number]) {
    const months = value ? Math.round(Number(value) * (unit === "Years" ? 12 : 1)) : null;
    if (months === lead.term_months) return;
    save({ term_months: months });
  }

  function saveRate(raw: string, tbd: boolean) {
    const rate = tbd || !raw ? null : Number(raw);
    if (rate === lead.interest_rate) return;
    save({ interest_rate: rate });
  }

  function saveSponsors(names: string[]) {
    save({ sponsor_names: names });
  }

  function saveUseOfProceeds(items: UseOfProceedsItem[]) {
    save({ use_of_proceeds: items });
  }

  const { ltv, ltc } = computeLtvLtc(
    Number(form.loan_amount) || 0,
    Number(form.purchase_price) || 0,
    lead.use_of_proceeds
  );

  return (
    <div className="rounded-lg border border-oak-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">Deal Details</div>
        {savedFlash && <div className="text-[11px] font-medium text-oak-sage">Saved</div>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Borrower / Entity</label>
          <input
            className={inputCls}
            value={form.borrower_name}
            onChange={(e) => update("borrower_name", e.target.value)}
            onBlur={(e) => saveTextField("borrower_name", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Contact Name</label>
          <input
            className={inputCls}
            value={form.contact_name}
            onChange={(e) => update("contact_name", e.target.value)}
            onBlur={(e) => saveTextField("contact_name", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Contact Email</label>
          <input
            className={inputCls}
            value={form.contact_email}
            onChange={(e) => update("contact_email", e.target.value)}
            onBlur={(e) => saveTextField("contact_email", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Contact Phone</label>
          <input
            className={inputCls}
            value={form.contact_phone}
            onChange={(e) => update("contact_phone", e.target.value)}
            onBlur={(e) => saveTextField("contact_phone", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Loan Request Amount</label>
          <input
            className={inputCls}
            value={form.loan_amount}
            onChange={(e) => update("loan_amount", e.target.value.replace(/[^0-9.]/g, ""))}
            onBlur={(e) => saveNumberField("loan_amount", e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Property Address</label>
          <input
            className={inputCls}
            value={form.property_address}
            onChange={(e) => update("property_address", e.target.value)}
            onBlur={(e) => saveTextField("property_address", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input
            className={inputCls}
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            onBlur={(e) => saveTextField("city", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <input
            className={inputCls}
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            onBlur={(e) => saveTextField("state", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Asset Class</label>
          <select
            className={inputCls}
            value={form.asset_class}
            onChange={(e) => {
              update("asset_class", e.target.value);
              save({ asset_class: e.target.value });
            }}
          >
            {ASSET_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Loan Type</label>
          <select
            className={inputCls}
            value={form.loan_type}
            onChange={(e) => {
              update("loan_type", e.target.value);
              save({ loan_type: e.target.value });
            }}
          >
            {LOAN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Purchase Price / Value</label>
          <input
            className={inputCls}
            value={form.purchase_price}
            onChange={(e) => update("purchase_price", e.target.value.replace(/[^0-9.]/g, ""))}
            onBlur={(e) => saveNumberField("purchase_price", e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div>
          <label className={labelCls}>Equity Contribution</label>
          <input
            className={inputCls}
            value={form.equity_contribution}
            onChange={(e) => update("equity_contribution", e.target.value.replace(/[^0-9.]/g, ""))}
            onBlur={(e) => saveNumberField("equity_contribution", e.target.value)}
            inputMode="decimal"
          />
        </div>

        <div>
          <label className={labelCls}>Interest Rate</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                className={`${inputCls} pr-6 disabled:bg-black/[0.03] disabled:text-oak-sagelight`}
                value={form.interest_rate}
                disabled={form.rateTbd}
                onChange={(e) => update("interest_rate", e.target.value.replace(/[^0-9.]/g, ""))}
                onBlur={(e) => saveRate(e.target.value, form.rateTbd)}
                inputMode="decimal"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-oak-sagelight">
                %
              </span>
            </div>
            <label className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-oak-sage">
              <input
                type="checkbox"
                checked={form.rateTbd}
                onChange={(e) => {
                  update("rateTbd", e.target.checked);
                  saveRate(form.interest_rate, e.target.checked);
                }}
              />
              TBD
            </label>
          </div>
        </div>
        <div>
          <label className={labelCls}>Term</label>
          <div className="flex gap-2">
            <input
              className={`${inputCls} flex-1`}
              value={form.termValue}
              onChange={(e) => update("termValue", e.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={(e) => saveTerm(e.target.value, form.termUnit)}
              inputMode="decimal"
            />
            <select
              className={inputCls}
              style={{ width: 110 }}
              value={form.termUnit}
              onChange={(e) => {
                const unit = e.target.value as (typeof TERM_UNITS)[number];
                update("termUnit", unit);
                saveTerm(form.termValue, unit);
              }}
            >
              {TERM_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(ltv !== null || ltc !== null) && (
          <div className="col-span-2 flex gap-4 rounded-md bg-oak-gold/10 px-3 py-2 text-[12px]">
            <div>
              <span className="text-oak-sage">LTV (computed): </span>
              <span className="font-semibold text-oak-ink">{formatPercent(ltv)}</span>
            </div>
            <div>
              <span className="text-oak-sage">LTC (computed): </span>
              <span className="font-semibold text-oak-ink">{formatPercent(ltc)}</span>
            </div>
          </div>
        )}

        <div className="col-span-2">
          <label className={labelCls}>Use of Proceeds</label>
          <UseOfProceedsInput value={lead.use_of_proceeds} onChange={saveUseOfProceeds} />
        </div>

        <div>
          <label className={labelCls}>Exit Strategy</label>
          <select
            className={inputCls}
            value={form.exit_strategy}
            onChange={(e) => {
              update("exit_strategy", e.target.value);
              save({ exit_strategy: e.target.value || null });
            }}
          >
            <option value="">Select...</option>
            {EXIT_STRATEGIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Source</label>
          <input
            className={inputCls}
            value={form.source}
            onChange={(e) => update("source", e.target.value)}
            onBlur={(e) => saveTextField("source", e.target.value)}
          />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Sponsor Name(s)</label>
          <SponsorNamesInput value={lead.sponsor_names} onChange={saveSponsors} />
        </div>

        <div>
          <label className={labelCls}>Assigned To</label>
          <select
            className={inputCls}
            value={form.assigned_to}
            onChange={(e) => {
              update("assigned_to", e.target.value);
              save({ assigned_to: e.target.value || null });
            }}
          >
            <option value="">Select executive...</option>
            {EXECUTIVES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea
            className={inputCls}
            rows={3}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            onBlur={(e) => saveTextField("notes", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
