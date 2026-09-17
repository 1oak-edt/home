import { useMemo, useState } from "react";
import { ASSET_CLASSES, EXECUTIVES, EXIT_STRATEGIES, LOAN_TYPES } from "../types";
import type { NewLeadInput, UseOfProceedsItem } from "../types";
import { computeLtvLtc, formatPercent } from "../utils/format";
import { Modal } from "./Modal";
import { SponsorNamesInput } from "./SponsorNamesInput";
import { UseOfProceedsInput } from "./UseOfProceedsInput";

interface Props {
  onCancel: () => void;
  onCreate: (input: NewLeadInput) => Promise<void>;
}

const inputCls =
  "w-full rounded-md border border-oak-line bg-white px-3 py-2 text-sm focus:border-oak-sage focus:outline-none";
const labelCls = "block text-[12px] font-medium uppercase tracking-wide text-oak-sage mb-1";

const TERM_UNITS = ["Months", "Years"] as const;

export function NewLeadModal({ onCancel, onCreate }: Props) {
  const [form, setForm] = useState({
    borrower_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    property_address: "",
    city: "",
    state: "",
    asset_class: ASSET_CLASSES[0] as string,
    loan_type: LOAN_TYPES[0] as string,
    loan_amount: "",
    purchase_price: "",
    equity_contribution: "",
    interest_rate: "",
    rateTbd: false,
    termValue: "",
    termUnit: "Months" as (typeof TERM_UNITS)[number],
    exit_strategy: "",
    source: "",
    assigned_to: "",
  });
  const [sponsorNames, setSponsorNames] = useState<string[]>([]);
  const [useOfProceeds, setUseOfProceeds] = useState<UseOfProceedsItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const { ltv, ltc } = useMemo(
    () => computeLtvLtc(Number(form.loan_amount) || 0, Number(form.purchase_price) || 0, useOfProceeds),
    [form.loan_amount, form.purchase_price, useOfProceeds]
  );

  async function handleSubmit() {
    if (!form.borrower_name.trim()) {
      setError("Borrower / entity name is required.");
      return;
    }
    const amount = Number(form.loan_amount);
    if (!form.loan_amount || Number.isNaN(amount) || amount <= 0) {
      setError("Enter a valid loan request amount.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const termMonths = form.termValue
        ? Math.round(Number(form.termValue) * (form.termUnit === "Years" ? 12 : 1))
        : null;
      await onCreate({
        borrower_name: form.borrower_name.trim(),
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        property_address: form.property_address || null,
        city: form.city || null,
        state: form.state || null,
        asset_class: form.asset_class,
        loan_type: form.loan_type,
        loan_amount: amount,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        equity_contribution: form.equity_contribution ? Number(form.equity_contribution) : null,
        interest_rate: form.rateTbd || !form.interest_rate ? null : Number(form.interest_rate),
        term_months: termMonths,
        exit_strategy: form.exit_strategy || null,
        sponsor_names: sponsorNames,
        use_of_proceeds: useOfProceeds.filter((r) => r.amount > 0),
        source: form.source || null,
        assigned_to: form.assigned_to || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create deal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onCancel} widthClass="max-w-2xl">
      <div className="p-6">
        <div className="font-condensed text-xl font-semibold text-oak-ink">New Deal</div>
        <div className="mt-0.5 text-sm text-oak-sage">Enters the pipeline at the Intake stage.</div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Borrower / Entity *</label>
            <input
              className={inputCls}
              value={form.borrower_name}
              onChange={(e) => update("borrower_name", e.target.value)}
              placeholder="e.g. Harborview Partners LLC"
            />
          </div>
          <div>
            <label className={labelCls}>Contact Name</label>
            <input
              className={inputCls}
              value={form.contact_name}
              onChange={(e) => update("contact_name", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Contact Email</label>
            <input
              className={inputCls}
              value={form.contact_email}
              onChange={(e) => update("contact_email", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Contact Phone</label>
            <input
              className={inputCls}
              value={form.contact_phone}
              onChange={(e) => update("contact_phone", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Loan Request Amount *</label>
            <input
              className={inputCls}
              value={form.loan_amount}
              onChange={(e) => update("loan_amount", e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="8500000"
              inputMode="decimal"
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Property Address</label>
            <input
              className={inputCls}
              value={form.property_address}
              onChange={(e) => update("property_address", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>City</label>
            <input className={inputCls} value={form.city} onChange={(e) => update("city", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>State</label>
            <input className={inputCls} value={form.state} onChange={(e) => update("state", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Asset Class</label>
            <select
              className={inputCls}
              value={form.asset_class}
              onChange={(e) => update("asset_class", e.target.value)}
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
              onChange={(e) => update("loan_type", e.target.value)}
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
              placeholder="12000000"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className={labelCls}>Equity Contribution</label>
            <input
              className={inputCls}
              value={form.equity_contribution}
              onChange={(e) => update("equity_contribution", e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="4000000"
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
                  placeholder="7.25"
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
                  onChange={(e) => update("rateTbd", e.target.checked)}
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
                placeholder="24"
                inputMode="decimal"
              />
              <select
                className={inputCls}
                style={{ width: 110 }}
                value={form.termUnit}
                onChange={(e) => update("termUnit", e.target.value as (typeof TERM_UNITS)[number])}
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
            <UseOfProceedsInput value={useOfProceeds} onChange={setUseOfProceeds} />
          </div>

          <div>
            <label className={labelCls}>Exit Strategy</label>
            <select
              className={inputCls}
              value={form.exit_strategy}
              onChange={(e) => update("exit_strategy", e.target.value)}
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
              placeholder="Broker Referral, Website..."
            />
          </div>

          <div className="col-span-2">
            <label className={labelCls}>Sponsor Name(s)</label>
            <SponsorNamesInput value={sponsorNames} onChange={setSponsorNames} />
          </div>

          <div>
            <label className={labelCls}>Assigned To</label>
            <select
              className={inputCls}
              value={form.assigned_to}
              onChange={(e) => update("assigned_to", e.target.value)}
            >
              <option value="">Select executive...</option>
              {EXECUTIVES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="mt-3 text-sm font-medium text-red-700">{error}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-oak-sage hover:bg-black/[0.04]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-oak-gold px-4 py-2 text-sm font-semibold text-oak-darker shadow-card hover:brightness-95 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Deal"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
