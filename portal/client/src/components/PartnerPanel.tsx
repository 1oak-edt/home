import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { PARTNER_TYPES, type Lead, type Partner, type PartnerFields } from "../types";
import { errorMessage } from "../utils/errors";
import { formatCurrency } from "../utils/format";
import { CLOSED_HEX, STAGE_HEX } from "../utils/stageColors";

interface Props {
  partner: Partner;
  leads: Lead[];
  onClose: () => void;
  onChanged: (partner: Partner) => void;
  onDeleted: (id: string) => void;
  onOpenDeal: (lead: Lead) => void;
}

const inputCls =
  "w-full rounded-md border border-oak-line bg-white px-3 py-2 text-sm focus:border-oak-sage focus:outline-none";
const labelCls = "block text-[11px] font-medium uppercase tracking-wide text-oak-sage mb-1";

type TextKey = Exclude<keyof PartnerFields, "type">;

function StageDot({ stage }: { stage: string }) {
  const color = STAGE_HEX[stage] ?? CLOSED_HEX;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-oak-sage">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {stage}
    </span>
  );
}

const dealHaystack = (l: Lead) =>
  [l.borrower_name, l.city, l.state, l.asset_class, l.loan_type, l.stage, l.contact_name, l.property_address, ...(l.sponsor_names ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export function PartnerPanel({ partner, leads, onClose, onChanged, onDeleted, onOpenDeal }: Props) {
  const [form, setForm] = useState(() => toForm(partner));
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(toForm(partner));
    setConfirmingDelete(false);
    setQuery("");
  }, [partner.id]);

  function toForm(p: Partner) {
    return {
      contact_name: p.contact_name,
      preferred_name: p.preferred_name,
      company: p.company,
      email: p.email,
      phone: p.phone,
      market: p.market,
      specialty: p.specialty,
      notes: p.notes,
    };
  }

  async function save(patch: Partial<PartnerFields>) {
    setError(null);
    try {
      const updated = await api.updatePartner(partner.id, patch);
      onChanged(updated);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    } catch (e) {
      setForm(toForm(partner));
      setError(errorMessage(e, "Couldn't save that change."));
    }
  }

  function saveText(key: TextKey, raw: string) {
    const value = raw.trim();
    if (value === partner[key]) return;
    if (key === "contact_name" && !value) {
      setForm((f) => ({ ...f, contact_name: partner.contact_name }));
      return;
    }
    save({ [key]: value });
  }

  async function runDealAction(action: () => Promise<Partner>) {
    setBusy(true);
    setError(null);
    try {
      onChanged(await action());
    } catch (e) {
      setError(errorMessage(e, "Couldn't update linked deals."));
    } finally {
      setBusy(false);
    }
  }

  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const linked = partner.deal_ids.map((id) => ({ id, lead: leadById.get(id) ?? null }));
  const linkedLeads = linked.flatMap((x) => (x.lead ? [x.lead] : []));
  const totalVolume = linkedLeads.reduce((sum, l) => sum + (l.loan_amount || 0), 0);
  const financed = linkedLeads.filter((l) => l.stage === "Financed").length;

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return leads
      .filter((l) => !partner.deal_ids.includes(l.id) && tokens.every((t) => dealHaystack(l).includes(t)))
      .slice(0, 8);
  }, [leads, query, partner.deal_ids]);

  async function handleDelete() {
    setBusy(true);
    try {
      await api.deletePartner(partner.id);
      onDeleted(partner.id);
    } catch (e) {
      setError(errorMessage(e, "Couldn't delete this partner."));
      setBusy(false);
    }
  }

  const textField = (key: TextKey, label: string, opts?: { type?: string; span2?: boolean }) => (
    <div className={opts?.span2 ? "col-span-2" : ""}>
      <label className={labelCls}>{label}</label>
      <input
        type={opts?.type ?? "text"}
        className={inputCls}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        onBlur={(e) => saveText(key, e.target.value)}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[540px] flex-col bg-oak-cream shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-oak-line bg-white px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="truncate font-condensed text-2xl font-semibold text-oak-ink">{partner.contact_name}</div>
            <div className="truncate text-[13px] text-oak-sage">
              {partner.company || "No company"} {partner.type && <span className="text-oak-sagelight">· {partner.type}</span>}
            </div>
          </div>
          {savedFlash && <div className="mt-1 text-[11px] font-medium text-oak-sage">Saved</div>}
          <button onClick={onClose} className="rounded-md p-1.5 text-oak-sage hover:bg-black/[0.05]" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>
          )}

          <section className="rounded-lg border border-oak-line bg-white p-4">
            <div className="mb-3 text-[12px] font-medium uppercase tracking-wide text-oak-sage">Contact</div>
            <div className="grid grid-cols-2 gap-3">
              {textField("contact_name", "Point of contact")}
              {textField("preferred_name", "Goes by")}
              {textField("company", "Company", { span2: true })}
              <div>
                <label className={labelCls}>Type</label>
                <select
                  className={inputCls}
                  value={partner.type}
                  onChange={(e) => save({ type: e.target.value })}
                >
                  {PARTNER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {textField("specialty", "Specialty")}
              {textField("email", "Email", { type: "email" })}
              {textField("phone", "Phone")}
              {textField("market", "Market / state", { span2: true })}
            </div>
          </section>

          <section className="mt-4 rounded-lg border border-oak-line bg-white p-4">
            <div className="mb-2 text-[12px] font-medium uppercase tracking-wide text-oak-sage">Notes</div>
            <textarea
              rows={4}
              className={inputCls}
              placeholder="Relationship notes, preferences, last conversation..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              onBlur={(e) => saveText("notes", e.target.value)}
            />
          </section>

          <section className="mt-4 rounded-lg border border-oak-line bg-white p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">Brought deals</div>
              <div className="text-[12px] text-oak-sagelight">
                {linkedLeads.length} deal{linkedLeads.length === 1 ? "" : "s"}
                {linkedLeads.length > 0 && ` · ${formatCurrency(totalVolume)} requested · ${financed} financed`}
              </div>
            </div>

            <div className="relative mt-3">
              <input
                className={inputCls}
                placeholder="Search deals by borrower, city, asset class, stage..."
                aria-label="Search deals to link"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query.trim() && (
                <div className="mt-1 overflow-hidden rounded-md border border-oak-line bg-white">
                  {results.length === 0 ? (
                    <div className="px-3 py-2 text-[12px] text-oak-sagelight">No unlinked deals match "{query}".</div>
                  ) : (
                    results.map((l) => (
                      <button
                        key={l.id}
                        disabled={busy}
                        onClick={() => {
                          setQuery("");
                          runDealAction(() => api.linkPartnerDeal(partner.id, l.id));
                        }}
                        className="flex w-full items-center justify-between gap-3 border-b border-oak-line/60 px-3 py-2 text-left last:border-b-0 hover:bg-oak-goldlight/40 disabled:opacity-60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-oak-ink">{l.borrower_name}</span>
                          <span className="block truncate text-[11px] text-oak-sagelight">
                            {[l.asset_class, [l.city, l.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end">
                          <StageDot stage={l.stage} />
                          <span className="text-[11px] text-oak-sagelight">{formatCurrency(l.loan_amount)}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              {linked.length === 0 && (
                <div className="text-[13px] text-oak-sagelight">No deals linked yet. Search above to link one.</div>
              )}
              {linked.map(({ id, lead }) => (
                <div key={id} className="flex items-center gap-2 rounded-md border border-oak-line px-3 py-2">
                  {lead ? (
                    <>
                      <button onClick={() => onOpenDeal(lead)} className="min-w-0 flex-1 text-left" title="Open deal">
                        <span className="block truncate text-[13px] font-medium text-oak-sage hover:underline">{lead.borrower_name}</span>
                        <span className="block truncate text-[11px] text-oak-sagelight">
                          {[lead.asset_class, [lead.city, lead.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                        </span>
                      </button>
                      <div className="flex shrink-0 flex-col items-end">
                        <StageDot stage={lead.stage} />
                        <span className="text-[11px] text-oak-sagelight">{formatCurrency(lead.loan_amount)}</span>
                      </div>
                    </>
                  ) : (
                    <span className="flex-1 text-[12px] italic text-oak-sagelight">This deal no longer exists</span>
                  )}
                  <button
                    disabled={busy}
                    onClick={() => runDealAction(() => api.unlinkPartnerDeal(partner.id, id))}
                    className="shrink-0 rounded p-1 text-oak-sagelight hover:text-red-700 disabled:opacity-60"
                    aria-label="Unlink deal"
                    title="Unlink deal"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-5 flex items-center justify-between border-t border-oak-line pt-4">
            <div className="text-[11px] text-oak-sagelight">
              Added {new Date(partner.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </div>
            {confirmingDelete ? (
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-oak-ink">Delete this partner?</span>
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  Yes, delete
                </button>
                <button onClick={() => setConfirmingDelete(false)} className="font-medium text-oak-sage hover:text-oak-ink">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="text-[12px] font-medium text-oak-sagelight hover:text-red-700"
              >
                Delete partner
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
