import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { ESCROW_CHECKLIST, type ChecklistItemDef, type ChecklistSection } from "../data/escrowChecklist";
import { DOCUMENT_CATEGORIES, type ChecklistItemState, type ChecklistPatch, type LeadDocument } from "../types";
import { formatDateTime } from "../utils/format";

interface Props {
  leadId: string;
  currentUser: string;
}

const categoryRank = (category: string) => {
  const i = (DOCUMENT_CATEGORIES as readonly string[]).indexOf(category);
  return i === -1 ? DOCUMENT_CATEGORIES.length : i;
};

function DataRoomSearch({
  docs,
  attachedIds,
  onPick,
  onClose,
}: {
  docs: LeadDocument[];
  attachedIds: string[];
  onPick: (doc: LeadDocument) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return docs
      .filter((d) => {
        const haystack = `${d.original_name} ${d.category}`.toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      })
      .sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || a.original_name.localeCompare(b.original_name));
  }, [docs, query]);

  return (
    <div className="rounded-md border border-oak-line bg-oak-cream/60 p-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          placeholder="Search the Data Room by file name or category..."
          aria-label="Search the Data Room"
          className="flex-1 rounded-md border border-oak-line bg-white px-3 py-1.5 text-[13px] focus:border-oak-sage focus:outline-none"
        />
        <button
          onClick={onClose}
          className="rounded-md border border-oak-line px-2.5 py-1.5 text-[12px] font-semibold text-oak-sage hover:border-oak-sage hover:text-oak-ink"
        >
          Done
        </button>
      </div>
      <div className="scrollbar-thin mt-2 max-h-56 overflow-y-auto">
        {docs.length === 0 ? (
          <div className="px-1 py-2 text-[12px] text-oak-sagelight">
            The Data Room has no files yet. Upload PDFs in the Data Room tab, then attach them here.
          </div>
        ) : results.length === 0 ? (
          <div className="px-1 py-2 text-[12px] text-oak-sagelight">No files match "{query}".</div>
        ) : (
          <ul className="flex flex-col">
            {results.map((d) => {
              const attached = attachedIds.includes(d.id);
              return (
                <li key={d.id}>
                  <button
                    disabled={attached}
                    onClick={() => onPick(d)}
                    className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left hover:bg-white disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                  >
                    <span className="min-w-0 truncate text-[13px] font-medium text-oak-ink">{d.original_name}</span>
                    <span className="shrink-0 text-[11px] text-oak-sagelight">
                      {attached ? "Attached" : d.category}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  state,
  docs,
  open,
  onToggleOpen,
  onApply,
  leadId,
}: {
  item: ChecklistItemDef;
  state: ChecklistItemState;
  docs: LeadDocument[];
  open: boolean;
  onToggleOpen: () => void;
  onApply: (patch: ChecklistPatch) => void;
  leadId: string;
}) {
  const na = !!state.na;
  const received = !!state.received;
  const docIds = state.docIds ?? [];
  const docById = useMemo(() => new Map(docs.map((d) => [d.id, d])), [docs]);

  return (
    <div className={`border-t border-oak-line/60 px-4 py-3 first:border-t-0 ${na ? "bg-black/[0.02]" : ""}`}>
      <div className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-3 lg:grid-cols-[24px_minmax(0,1.3fr)_minmax(0,1fr)]">
        <input
          type="checkbox"
          aria-label={`Received: ${item.task}`}
          checked={received}
          disabled={na}
          onChange={(e) => onApply({ received: e.target.checked })}
          className="mt-0.5 h-4 w-4 accent-oak-dark"
        />

        <div className={na ? "opacity-50" : ""}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[14px] font-medium text-oak-ink ${received ? "text-oak-sage" : ""}`}>{item.task}</span>
            {na && <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-oak-sage">N/A</span>}
          </div>
          {item.description && <div className="mt-0.5 text-[12px] leading-snug text-oak-sagelight">{item.description}</div>}
          {received && state.received_at && (
            <div className="mt-1 text-[11px] font-medium text-oak-sage">
              Received{state.received_by ? ` by ${state.received_by}` : ""} · {formatDateTime(state.received_at)}
            </div>
          )}
        </div>

        <div className="col-span-2 flex flex-col gap-1.5 pl-9 lg:col-span-1 lg:pl-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {docIds.map((id) => {
              const doc = docById.get(id);
              return (
                <span
                  key={id}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-oak-line bg-white py-0.5 pl-2.5 pr-1 text-[12px]"
                >
                  {doc ? (
                    <button
                      onClick={() => api.downloadDocument(leadId, doc.id, doc.original_name)}
                      title={`${doc.original_name} — click to download`}
                      className="min-w-0 truncate font-medium text-oak-sage hover:underline"
                    >
                      {doc.original_name}
                    </button>
                  ) : (
                    <span className="italic text-oak-sagelight">File removed from Data Room</span>
                  )}
                  <button
                    onClick={() => onApply({ docIds: docIds.filter((d) => d !== id) })}
                    className="rounded-full px-1 text-oak-sagelight hover:text-red-700"
                    aria-label="Unlink file"
                    title="Unlink file"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            {!na && (
              <button
                onClick={onToggleOpen}
                className="rounded-md border border-oak-line px-2.5 py-1 text-[12px] font-semibold text-oak-sage hover:border-oak-sage hover:text-oak-ink"
              >
                {open ? "Close search" : docIds.length > 0 ? "+ Attach another file" : "Attach file from Data Room"}
              </button>
            )}
            <button
              onClick={() => onApply({ na: !na })}
              className="text-[11px] font-medium text-oak-sagelight hover:text-oak-ink hover:underline"
            >
              {na ? "Mark applicable" : "Mark N/A"}
            </button>
          </div>
        </div>
      </div>

      {open && !na && (
        <div className="mt-2 pl-9">
          <DataRoomSearch
            docs={docs}
            attachedIds={docIds}
            onClose={onToggleOpen}
            onPick={(doc) =>
              onApply({ docIds: [...docIds, doc.id], ...(received ? {} : { received: true }) })
            }
          />
        </div>
      )}
    </div>
  );
}

export function EscrowChecklistTab({ leadId, currentUser }: Props) {
  const [items, setItems] = useState<Record<string, ChecklistItemState>>({});
  const [docs, setDocs] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [outstandingOnly, setOutstandingOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getEscrowChecklist(leadId), api.getDocuments(leadId)])
      .then(([checklist, documents]) => {
        if (cancelled) return;
        setItems(checklist.items ?? {});
        setDocs(documents);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load the checklist."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  // Optimistic: show the change immediately, then reconcile only the touched items with the server's answer.
  async function apply(updates: Record<string, ChecklistPatch>) {
    const ids = Object.keys(updates);
    const before = Object.fromEntries(ids.map((id) => [id, items[id]]));
    const now = new Date().toISOString();
    setError(null);
    setItems((cur) => {
      const next = { ...cur };
      for (const id of ids) {
        const patch = updates[id];
        next[id] = {
          ...cur[id],
          ...patch,
          ...(patch.received === true
            ? { received_at: now, received_by: currentUser }
            : patch.received === false
              ? { received_at: null, received_by: null }
              : {}),
        };
      }
      return next;
    });
    try {
      const res = await api.updateEscrowChecklist(leadId, updates);
      setItems((cur) => ({ ...cur, ...Object.fromEntries(ids.filter((id) => res.items[id]).map((id) => [id, res.items[id]])) }));
    } catch (e) {
      setItems((cur) => {
        const next = { ...cur };
        for (const id of ids) {
          if (before[id]) next[id] = before[id];
          else delete next[id];
        }
        return next;
      });
      setError(e instanceof Error ? e.message : "Couldn't save that change.");
    }
  }

  const counts = (section: ChecklistSection) => {
    const applicable = section.items.filter((i) => !items[i.id]?.na);
    return { done: applicable.filter((i) => items[i.id]?.received).length, total: applicable.length };
  };
  const overall = ESCROW_CHECKLIST.reduce(
    (acc, s) => {
      const c = counts(s);
      return { done: acc.done + c.done, total: acc.total + c.total };
    },
    { done: 0, total: 0 }
  );
  const naCount = ESCROW_CHECKLIST.flatMap((s) => s.items).filter((i) => items[i.id]?.na).length;

  if (loading) return <div className="py-16 text-center text-oak-sagelight">Loading checklist...</div>;

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <div className="sticky -top-5 z-10 -mx-1 -mt-5 bg-oak-cream px-1 pb-2 pt-5">
        <div className="rounded-lg border border-oak-line bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">Escrow Checklist</div>
              <div className="mt-0.5 text-[13px] text-oak-ink">
                <span className="font-semibold">
                  {overall.done} of {overall.total}
                </span>{" "}
                received{naCount > 0 ? ` · ${naCount} marked N/A` : ""}
              </div>
            </div>
            <label className="flex items-center gap-2 text-[12px] font-medium text-oak-ink">
              <input
                type="checkbox"
                checked={outstandingOnly}
                onChange={(e) => setOutstandingOnly(e.target.checked)}
                className="accent-oak-dark"
              />
              Show outstanding only
            </label>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className="h-full rounded-full bg-oak-gold transition-all"
              style={{ width: `${overall.total > 0 ? (overall.done / overall.total) * 100 : 0}%` }}
            />
          </div>
        </div>
        {error && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>
        )}
      </div>

      {ESCROW_CHECKLIST.map((section) => {
        const c = counts(section);
        const visible = section.items.filter((i) => !(outstandingOnly && (items[i.id]?.received || items[i.id]?.na)));
        if (outstandingOnly && visible.length === 0) return null;
        const optionalSection = /if applicable/i.test(section.title);
        const allNa = section.items.every((i) => items[i.id]?.na);
        return (
          <section key={section.id} className="rounded-lg border border-oak-line bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-oak-line px-4 py-2.5">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-oak-sage">{section.title}</h3>
              <div className="flex items-center gap-3">
                {optionalSection && (
                  <button
                    onClick={() => apply(Object.fromEntries(section.items.map((i) => [i.id, { na: !allNa }])))}
                    className="text-[11px] font-medium text-oak-sagelight hover:text-oak-ink hover:underline"
                  >
                    {allNa ? "Include section" : "Mark whole section N/A"}
                  </button>
                )}
                <span className="text-[12px] font-medium tabular-nums text-oak-sage">
                  {c.done}/{c.total}
                </span>
              </div>
            </div>
            {visible.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                state={items[item.id] ?? {}}
                docs={docs}
                open={openItem === item.id}
                onToggleOpen={() => setOpenItem((cur) => (cur === item.id ? null : item.id))}
                onApply={(patch) => apply({ [item.id]: patch })}
                leadId={leadId}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}
