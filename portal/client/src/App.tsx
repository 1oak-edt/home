import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { nameForUser } from "./authUsers";
import { DealMap } from "./components/DealMap";
import { DealRecordPage } from "./components/DealRecordPage";
import { Filters, type FilterState } from "./components/Filters";
import { FunnelChart } from "./components/FunnelChart";
import { Header, type ViewKey } from "./components/Header";
import { LoginScreen } from "./components/LoginScreen";
import { LostDeals } from "./components/LostDeals";
import { MetricsBar } from "./components/MetricsBar";
import { NewLeadModal } from "./components/NewLeadModal";
import { PartnersPage } from "./components/PartnersPage";
import { PipelineBoard } from "./components/PipelineBoard";
import { ReasonDialog } from "./components/ReasonDialog";
import { useAuth } from "./hooks/useAuth";
import type { Lead, Metrics, NewLeadInput, Stage } from "./types";

const EMPTY_FILTERS: FilterState = { search: "", assetClass: "", loanType: "", assignedTo: "" };

export default function App() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-oak-cream" />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <Dashboard currentUser={nameForUser(user)} />;
}

function Dashboard({ currentUser }: { currentUser: string }) {
  const [view, setView] = useState<ViewKey>("pipeline");
  const [mapExpanded, setMapExpanded] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [reasonDialog, setReasonDialog] = useState<{ lead: Lead; kind: "Disqualified" | "Lost" } | null>(
    null
  );
  const [showNewLead, setShowNewLead] = useState(false);

  async function refresh() {
    const [leadsRes, metricsRes] = await Promise.all([api.getLeads(), api.getMetrics()]);
    setLeads(leadsRes);
    setMetrics(metricsRes);
  }

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  const assignees = useMemo(
    () => Array.from(new Set(leads.map((l) => l.assigned_to).filter(Boolean))) as string[],
    [leads]
  );

  const filteredActiveLeads = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return leads.filter((l) => {
      if (l.stage === "Disqualified" || l.stage === "Lost") return false;
      if (filters.assetClass && l.asset_class !== filters.assetClass) return false;
      if (filters.loanType && l.loan_type !== filters.loanType) return false;
      if (filters.assignedTo && l.assigned_to !== filters.assignedTo) return false;
      if (q) {
        const haystack = [l.borrower_name, l.contact_name, l.city, l.state]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [leads, filters]);

  const closedLeads = useMemo(
    () => leads.filter((l) => l.stage === "Disqualified" || l.stage === "Lost"),
    [leads]
  );

  async function handleStageChange(lead: Lead, stage: Stage) {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage } : l)));
    try {
      const updated = await api.changeStage(lead.id, stage);
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setMetrics(await api.getMetrics());
      setDetailLead((d) => (d && d.id === updated.id ? updated : d));
    } catch (e) {
      await refresh();
      setError(e instanceof Error ? e.message : "Failed to move deal.");
    }
  }

  async function handleConfirmReason(reason: string) {
    if (!reasonDialog) return;
    const { lead, kind } = reasonDialog;
    setReasonDialog(null);
    try {
      const updated = await api.changeStage(lead.id, kind, reason);
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setMetrics(await api.getMetrics());
      setDetailLead((d) => (d && d.id === updated.id ? updated : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update deal.");
    }
  }

  async function handleReactivate(lead: Lead) {
    const target = (lead.prior_stage ?? "Intake") as Stage;
    await handleStageChange(lead, target);
    setDetailLead(null);
  }

  async function handleCreate(input: NewLeadInput) {
    const created = await api.createLead(input);
    setLeads((prev) => [created, ...prev]);
    setMetrics(await api.getMetrics());
    setShowNewLead(false);
  }

  async function handleOpenDealFromAlert(leadId: string) {
    const existing = leads.find((l) => l.id === leadId);
    if (existing) {
      setDetailLead(existing);
      return;
    }
    try {
      const lead = await api.getLead(leadId);
      setLeads((prev) => [lead, ...prev]);
      setDetailLead(lead);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open deal from alert.");
    }
  }

  return (
    <div className="min-h-screen bg-oak-cream">
      <Header
        view={view}
        onViewChange={setView}
        lostCount={closedLeads.length}
        onNewLead={() => setShowNewLead(true)}
        currentUser={currentUser}
        onOpenDealFromAlert={handleOpenDealFromAlert}
      />

      <main className="mx-auto max-w-[1440px] px-6 py-6">
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {view !== "partners" && (
          <div className="mb-5">
            <MetricsBar metrics={metrics} />
          </div>
        )}

        {view === "pipeline" ? (
          <>
            <div className="mb-5">
              <FunnelChart metrics={metrics} />
            </div>
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">
                  Deal Map
                </div>
                <button
                  onClick={() => setMapExpanded((v) => !v)}
                  className="text-[12px] font-semibold text-oak-sage hover:text-oak-ink"
                >
                  {mapExpanded ? "Hide" : "Show"}
                </button>
              </div>
              {mapExpanded && <DealMap leads={leads} onOpen={setDetailLead} />}
            </div>
            <div className="mb-4">
              <Filters filters={filters} onChange={setFilters} assignees={assignees} />
            </div>
            {loading ? (
              <div className="py-16 text-center text-oak-sagelight">Loading pipeline...</div>
            ) : (
              <PipelineBoard
                leads={filteredActiveLeads}
                onOpen={setDetailLead}
                onDisqualify={(lead) => setReasonDialog({ lead, kind: "Disqualified" })}
                onMarkLost={(lead) => setReasonDialog({ lead, kind: "Lost" })}
                onStageChange={handleStageChange}
              />
            )}
          </>
        ) : view === "lost" ? (
          <LostDeals leads={closedLeads} onOpen={setDetailLead} onReactivate={handleReactivate} />
        ) : (
          <PartnersPage leads={leads} onOpenDeal={setDetailLead} />
        )}
      </main>

      {detailLead && (
        <DealRecordPage
          lead={detailLead}
          currentUser={currentUser}
          onClose={() => setDetailLead(null)}
          onStageChange={handleStageChange}
          onDisqualify={(lead) => setReasonDialog({ lead, kind: "Disqualified" })}
          onMarkLost={(lead) => setReasonDialog({ lead, kind: "Lost" })}
          onReactivate={handleReactivate}
          onLeadUpdated={(updated) => {
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            setDetailLead(updated);
            api.getMetrics().then(setMetrics);
          }}
        />
      )}

      {reasonDialog && (
        <ReasonDialog
          lead={reasonDialog.lead}
          kind={reasonDialog.kind}
          onCancel={() => setReasonDialog(null)}
          onConfirm={handleConfirmReason}
        />
      )}

      {showNewLead && <NewLeadModal onCancel={() => setShowNewLead(false)} onCreate={handleCreate} />}
    </div>
  );
}
