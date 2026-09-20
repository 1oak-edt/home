import { useEffect, useState } from "react";
import { api } from "../api";
import { ACTIVE_STAGES } from "../types";
import type { Lead, Stage } from "../types";
import { AerialMap } from "./AerialMap";
import { ChatPanel } from "./ChatPanel";
import { CommentsPanel } from "./CommentsPanel";
import { DataRoomTab } from "./DataRoomTab";
import { DealOverviewForm } from "./DealOverviewForm";
import { EscrowChecklistTab } from "./EscrowChecklistTab";
import { ExecSummaryPanel } from "./ExecSummaryPanel";
import { TasksPanel } from "./TasksPanel";
import { UnderwritingTab } from "./underwriting/UnderwritingTab";

const TAB_LABELS = {
  overview: "Overview",
  dataroom: "Data Room",
  underwriting: "Valuation & Underwriting",
  checklist: "Escrow Checklist",
} as const;

interface HistoryEntry {
  id: string;
  from_stage: string | null;
  to_stage: string;
  reason: string | null;
  created_at: string;
}

interface Props {
  lead: Lead;
  currentUser: string;
  onClose: () => void;
  onStageChange: (lead: Lead, stage: Stage) => void;
  onDisqualify: (lead: Lead) => void;
  onMarkLost: (lead: Lead) => void;
  onReactivate: (lead: Lead) => void;
  onLeadUpdated: (lead: Lead) => void;
}

export function DealRecordPage({
  lead,
  currentUser,
  onClose,
  onStageChange,
  onDisqualify,
  onMarkLost,
  onReactivate,
  onLeadUpdated,
}: Props) {
  const [tab, setTab] = useState<"overview" | "dataroom" | "underwriting" | "checklist">("overview");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const isClosed = lead.stage === "Disqualified" || lead.stage === "Lost";

  useEffect(() => {
    api.getHistory(lead.id).then(setHistory);
  }, [lead.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function setPin(lat: number, lon: number) {
    const updated = await api.updateLead(lead.id, { latitude: lat, longitude: lon });
    onLeadUpdated(updated);
  }

  async function clearPin() {
    const updated = await api.updateLead(lead.id, { latitude: null, longitude: null });
    onLeadUpdated(updated);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-oak-cream">
      <div className="flex items-center gap-4 border-b border-oak-line bg-white px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate font-condensed text-2xl font-semibold text-oak-ink">
              {lead.borrower_name}
            </div>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                isClosed ? "bg-red-100 text-red-700" : "bg-oak-gold/30 text-oak-darker"
              }`}
            >
              {lead.stage}
            </span>
          </div>
          <div className="mt-0.5 flex gap-1.5">
            <span className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[11px] font-medium text-oak-sage">
              {lead.asset_class}
            </span>
            <span className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[11px] font-medium text-oak-sage">
              {lead.loan_type}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isClosed ? (
            <>
              <div className="hidden items-center gap-1 lg:flex">
                {ACTIVE_STAGES.map((s) => (
                  <button
                    key={s}
                    disabled={s === lead.stage}
                    onClick={() => onStageChange(lead, s)}
                    className={`rounded-md border px-2.5 py-1.5 text-[12px] font-medium ${
                      s === lead.stage
                        ? "cursor-default border-oak-dark bg-oak-dark text-oak-cream"
                        : "border-oak-line text-oak-sage hover:border-oak-sage hover:text-oak-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onDisqualify(lead)}
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                Disqualify
              </button>
              <button
                onClick={() => onMarkLost(lead)}
                className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-700 hover:bg-red-100"
              >
                Mark Lost
              </button>
            </>
          ) : (
            <button
              onClick={() => onReactivate(lead)}
              className="rounded-md bg-oak-gold px-3 py-1.5 text-[12px] font-semibold text-oak-darker shadow-card hover:brightness-95"
            >
              Reactivate to {lead.prior_stage ?? "Intake"}
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-2 rounded-md p-2 text-oak-sage hover:bg-black/[0.05]"
            aria-label="Close"
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {isClosed && lead.lost_reason && (
        <div className="border-b border-oak-line bg-red-50/60 px-6 py-2 text-[13px] text-red-800">
          <span className="font-semibold">
            {lead.stage === "Disqualified" ? "Disqualification reason: " : "Lost reason: "}
          </span>
          {lead.lost_reason}
        </div>
      )}

      <div className="border-b border-oak-line bg-white px-6">
        <div className="flex gap-1">
          {(["overview", "dataroom", "underwriting", "checklist"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-3 py-2.5 text-sm font-medium ${
                tab === t
                  ? "border-oak-dark text-oak-ink"
                  : "border-transparent text-oak-sage hover:text-oak-ink"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">
        {tab === "overview" ? (
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              <DealOverviewForm lead={lead} onUpdated={onLeadUpdated} />
              <AerialMap lead={lead} onSetPin={setPin} onClearPin={clearPin} />
              <ExecSummaryPanel lead={lead} onUpdated={onLeadUpdated} />
            </div>
            <div className="flex flex-col gap-5">
              <TasksPanel leadId={lead.id} currentUser={currentUser} />
              <CommentsPanel leadId={lead.id} currentUser={currentUser} />
              <ChatPanel leadId={lead.id} currentUser={currentUser} />
              {history.length > 0 && (
                <div className="rounded-lg border border-oak-line bg-white p-4">
                  <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">
                    Stage History
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    {history
                      .slice()
                      .reverse()
                      .map((h) => (
                        <div key={h.id} className="flex items-start gap-2 text-[12px]">
                          <div className="w-20 shrink-0 text-oak-sagelight">
                            {new Date(h.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-oak-ink">
                            {h.from_stage ? `${h.from_stage} → ${h.to_stage}` : `Created at ${h.to_stage}`}
                            {h.reason && <span className="text-oak-sagelight"> — {h.reason}</span>}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : tab === "dataroom" ? (
          <div className="mx-auto max-w-[1400px]">
            <DataRoomTab leadId={lead.id} borrowerName={lead.borrower_name} currentUser={currentUser} />
          </div>
        ) : tab === "underwriting" ? (
          <UnderwritingTab key={lead.id} lead={lead} currentUser={currentUser} />
        ) : (
          <EscrowChecklistTab key={lead.id} leadId={lead.id} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}
