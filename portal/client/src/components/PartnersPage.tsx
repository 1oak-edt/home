import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { PARTNER_TYPES, type Lead, type Partner, type PartnerFields } from "../types";
import { errorMessage } from "../utils/errors";
import { Modal } from "./Modal";
import { PartnerPanel } from "./PartnerPanel";

interface Props {
  leads: Lead[];
  onOpenDeal: (lead: Lead) => void;
}

const inputCls =
  "w-full rounded-md border border-oak-line bg-white px-3 py-2 text-sm focus:border-oak-sage focus:outline-none";
const labelCls = "block text-[11px] font-medium uppercase tracking-wide text-oak-sage mb-1";

function NewPartnerModal({ onCancel, onCreated }: { onCancel: () => void; onCreated: (p: Partner) => void }) {
  const [form, setForm] = useState<PartnerFields>({
    contact_name: "",
    preferred_name: "",
    company: "",
    type: "CRE",
    email: "",
    phone: "",
    market: "",
    specialty: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof PartnerFields, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contact_name.trim()) {
      setError("Enter the point of contact's name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onCreated(await api.createPartner({ ...form, contact_name: form.contact_name.trim() }));
    } catch (err) {
      setError(errorMessage(err, "Couldn't add the partner."));
      setSaving(false);
    }
  }

  const field = (key: keyof PartnerFields, label: string, opts?: { type?: string; span2?: boolean; autoFocus?: boolean }) => (
    <div className={opts?.span2 ? "col-span-2" : ""}>
      <label className={labelCls}>{label}</label>
      <input
        type={opts?.type ?? "text"}
        autoFocus={opts?.autoFocus}
        className={inputCls}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <Modal onClose={onCancel}>
      <form onSubmit={submit} className="p-5">
        <div className="font-condensed text-xl font-semibold text-oak-ink">Add partner</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {field("contact_name", "Point of contact *", { autoFocus: true })}
          {field("preferred_name", "Goes by")}
          {field("company", "Company", { span2: true })}
          <div>
            <label className={labelCls}>Type</label>
            <select className={inputCls} value={form.type} onChange={(e) => set("type", e.target.value)}>
              {PARTNER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {field("specialty", "Specialty")}
          {field("email", "Email", { type: "email" })}
          {field("phone", "Phone")}
          {field("market", "Market / state", { span2: true })}
        </div>
        {error && <div className="mt-3 text-[13px] text-red-700">{error}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm font-medium text-oak-sage hover:text-oak-ink">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-oak-gold px-4 py-2 text-sm font-semibold text-oak-darker shadow-card hover:brightness-95 disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add partner"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function PartnersPage({ leads, onOpenDeal }: Props) {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    api
      .getPartners()
      .then(setPartners)
      .catch((e) => setError(errorMessage(e, "Failed to load partners.")));
  }, []);

  const leadIds = useMemo(() => new Set(leads.map((l) => l.id)), [leads]);

  const visible = useMemo(() => {
    const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
    return (partners ?? [])
      .filter((p) => {
        if (typeFilter && p.type !== typeFilter) return false;
        const haystack = [p.contact_name, p.preferred_name, p.company, p.email, p.phone, p.market, p.specialty, p.type, p.notes]
          .join(" ")
          .toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      })
      .sort((a, b) => a.contact_name.localeCompare(b.contact_name));
  }, [partners, search, typeFilter]);

  const selected = partners?.find((p) => p.id === selectedId) ?? null;

  const replace = (updated: Partner) => setPartners((prev) => (prev ?? []).map((p) => (p.id === updated.id ? updated : p)));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, company, market, email..."
          aria-label="Search partners"
          className="w-full max-w-sm rounded-md border border-oak-line bg-white px-3 py-2 text-sm focus:border-oak-sage focus:outline-none"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by type"
          className="rounded-md border border-oak-line bg-white px-3 py-2 text-sm focus:border-oak-sage focus:outline-none"
        >
          <option value="">All types</option>
          {PARTNER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="text-[12px] text-oak-sagelight">
          {partners ? `${visible.length} of ${partners.length} partners` : ""}
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="ml-auto rounded-md bg-oak-gold px-4 py-2 text-sm font-semibold text-oak-darker shadow-card transition-transform hover:brightness-95 active:scale-[0.98]"
        >
          + Add partner
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {!partners && !error ? (
        <div className="py-16 text-center text-oak-sagelight">Loading partners...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-oak-line bg-white">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-oak-line text-[11px] font-semibold uppercase tracking-wide text-oak-sage">
                <th className="px-4 py-2.5">Contact</th>
                <th className="px-3 py-2.5">Company</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Market</th>
                <th className="px-3 py-2.5">Specialty</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Phone</th>
                <th className="px-3 py-2.5 text-right">Deals</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-oak-sagelight">
                    {partners && partners.length === 0 ? "No partners yet. Add one to get started." : "No partners match your search."}
                  </td>
                </tr>
              )}
              {visible.map((p) => {
                const dealCount = p.deal_ids.filter((id) => leadIds.has(id)).length;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className="cursor-pointer border-b border-oak-line/60 text-[13px] last:border-b-0 hover:bg-oak-goldlight/30"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-oak-ink">{p.contact_name}</div>
                      {p.preferred_name && p.preferred_name !== p.contact_name.split(" ")[0] && (
                        <div className="text-[11px] text-oak-sagelight">Goes by {p.preferred_name}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-oak-ink">{p.company || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[11px] font-semibold text-oak-sage">{p.type}</span>
                    </td>
                    <td className="px-3 py-2.5 text-oak-ink">{p.market || "—"}</td>
                    <td className="px-3 py-2.5 text-oak-ink">{p.specialty || "—"}</td>
                    <td className="px-3 py-2.5">
                      {p.email ? (
                        <a href={`mailto:${p.email}`} onClick={(e) => e.stopPropagation()} className="text-oak-sage hover:underline">
                          {p.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-oak-ink">{p.phone || "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      {dealCount > 0 ? (
                        <span className="rounded-full bg-oak-gold/40 px-2 py-0.5 text-[12px] font-semibold text-oak-darker">{dealCount}</span>
                      ) : (
                        <span className="text-oak-sagelight">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <PartnerPanel
          partner={selected}
          leads={leads}
          onClose={() => setSelectedId(null)}
          onChanged={replace}
          onDeleted={(id) => {
            setPartners((prev) => (prev ?? []).filter((p) => p.id !== id));
            setSelectedId(null);
          }}
          onOpenDeal={onOpenDeal}
        />
      )}

      {showNew && (
        <NewPartnerModal
          onCancel={() => setShowNew(false)}
          onCreated={(p) => {
            setPartners((prev) => [...(prev ?? []), p]);
            setShowNew(false);
            setSelectedId(p.id);
          }}
        />
      )}
    </div>
  );
}
