import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import type { Lead } from "../../types";
import {
  computeUnderwriting,
  defaultUnderwriting,
  normalizeUnderwriting,
  type Underwriting,
} from "../../utils/underwriting";
import { AssetMixCard, CompsCard } from "./AssetCompsSection";
import { LoanTermsCard, UseOfProceedsCard, YieldCard } from "./DebtSection";
import { mult, money, pct } from "../../utils/underwritingFormat";
import { Tile } from "./fields";
import { PnLCard, ValuationCard } from "./PnLValuationSection";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

const SAVE_DELAY_MS = 900;

export function UnderwritingTab({ lead, currentUser }: { lead: Lead; currentUser: string }) {
  const [pdfState, setPdfState] = useState<"idle" | "working" | "error">("idle");
  const [uw, setUw] = useState<Underwriting | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [meta, setMeta] = useState<{ updated_at: string | null; updated_by: string | null } | null>(null);

  const latest = useRef<Underwriting | null>(null);
  const pending = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(() => {
    setLoadError(null);
    api
      .getUnderwriting(lead.id)
      .then((res) => {
        const model = res.data ? normalizeUnderwriting(res.data, lead) : defaultUnderwriting(lead);
        latest.current = model;
        setUw(model);
        setMeta({ updated_at: res.updated_at, updated_by: res.updated_by });
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load underwriting."));
    // Only reload when switching deals; later lead edits must not overwrite in-progress work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  useEffect(() => {
    load();
  }, [load]);

  const flush = useCallback(async () => {
    if (!pending.current || !latest.current) return;
    pending.current = false;
    setStatus("saving");
    try {
      const res = await api.saveUnderwriting(lead.id, latest.current);
      setMeta(res);
      setStatus(pending.current ? "unsaved" : "saved");
    } catch {
      pending.current = true;
      setStatus("error");
    }
  }, [lead.id]);

  const update = useCallback(
    (fn: (u: Underwriting) => Underwriting) => {
      if (!latest.current) return;
      const next = fn(latest.current);
      latest.current = next;
      setUw(next);
      pending.current = true;
      setStatus("unsaved");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush]
  );

  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
      if (pending.current) void flush();
    };
  }, [flush]);

  const calc = useMemo(() => (uw ? computeUnderwriting(uw) : null), [uw]);

  async function handleDownloadPdf() {
    if (!uw || !calc) return;
    setPdfState("working");
    try {
      const { downloadUnderwritingPdf } = await import("../../utils/underwritingPdf");
      await downloadUnderwritingPdf({ lead, uw, calc, preparedBy: currentUser });
      setPdfState("idle");
    } catch {
      setPdfState("error");
    }
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        {loadError}{" "}
        <button className="font-semibold underline" onClick={load}>
          Retry
        </button>
      </div>
    );
  }
  if (!uw || !calc) return <div className="py-16 text-center text-oak-sagelight">Loading underwriting...</div>;

  const statusText: Record<SaveStatus, string> = {
    saved: meta?.updated_at
      ? `Saved${meta.updated_by ? ` by ${meta.updated_by}` : ""} · ${new Date(meta.updated_at).toLocaleString()}`
      : "Not saved yet — changes save automatically",
    saving: "Saving…",
    unsaved: "Unsaved changes…",
    error: "Save failed — will retry on next change",
  };

  const props = { uw, calc, update };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <div className="sticky -top-5 z-10 -mx-1 -mt-5 bg-oak-cream px-1 pb-2 pt-5">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Tile label="Concluded value" value={money(calc.value)} sub={calc.valueBasisLabel} />
          <Tile label="Derived loan" value={money(calc.loan)} sub={`${uw.ltv}% LTV`} />
          <Tile label="Combined LTV" value={pct(calc.detachLtv, 1)} sub={`Stabilized ${pct(calc.stabilizedLtv, 1)}`} />
          <Tile label="Debt yield" value={pct(calc.debtYieldCurrent, 2)} sub={`Pro forma ${pct(calc.debtYieldProforma, 2)}`} />
          <Tile
            label="DSCR"
            value={mult(calc.dscrCurrent)}
            sub={`Pro forma ${mult(calc.dscrProforma)}`}
            warn={calc.dscrCurrent != null && calc.dscrCurrent < 1}
          />
          <Tile label="Lender yield" value={pct(calc.yieldEffective, 2)} sub={uw.interestOnly ? "Interest-only" : "Amortizing"} />
        </div>
        <div className="mt-1.5 flex items-center justify-end gap-3">
          <span className={`text-[11px] ${status === "error" ? "font-semibold text-red-700" : "text-oak-sagelight"}`}>
            {statusText[status]}
          </span>
          {pdfState === "error" && <span className="text-[11px] font-semibold text-red-700">Couldn't create the PDF</span>}
          <button
            onClick={handleDownloadPdf}
            disabled={pdfState === "working"}
            className="rounded-md border border-oak-dark bg-oak-dark px-3 py-1 text-[12px] font-semibold text-oak-cream hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {pdfState === "working" ? "Creating PDF…" : "Download PDF"}
          </button>
        </div>
      </div>

      <AssetMixCard {...props} />
      <CompsCard {...props} />
      <PnLCard {...props} />
      <ValuationCard {...props} />
      <LoanTermsCard {...props} requestedLoan={lead.loan_amount ?? 0} />
      <YieldCard {...props} />
      <UseOfProceedsCard {...props} />
    </div>
  );
}
