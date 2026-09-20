import { useEffect, useState } from "react";
import { api } from "../api";
import type { Alert } from "../types";
import { formatDate } from "../utils/format";

interface Props {
  currentUser: string;
  onOpenDeal: (leadId: string) => void;
}

const SOURCE_ICON: Record<Alert["source_type"], string> = {
  comment: "💬",
  chat: "↩️",
  task: "✓",
  document: "📄",
};

export function AlertsBell({ currentUser, onOpenDeal }: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  function refreshCount() {
    api.getUnreadAlertCount(currentUser).then((r) => setCount(r.count));
  }

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (open) api.getAlerts(currentUser).then(setAlerts);
  }, [open, currentUser]);

  async function handleOpenAlert(alert: Alert) {
    if (!alert.read_at) {
      await api.markAlertRead(alert.id);
      setCount((c) => Math.max(0, c - 1));
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, read_at: new Date().toISOString() } : a)));
    }
    setOpen(false);
    onOpenDeal(alert.lead_id);
  }

  async function markAllRead() {
    await api.markAllAlertsRead(currentUser);
    setCount(0);
    setAlerts((prev) => prev.map((a) => ({ ...a, read_at: a.read_at ?? new Date().toISOString() })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-oak-sage hover:bg-black/[0.05]"
        aria-label="Alerts"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a5 5 0 00-5 5v2.2c0 .9-.3 1.8-.9 2.5L3 13.5c-.5.6 0 1.5.8 1.5h12.4c.8 0 1.3-.9.8-1.5l-1.1-1.8a4.1 4.1 0 01-.9-2.5V7a5 5 0 00-5-5z" />
          <path d="M8 16a2 2 0 004 0H8z" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-md border border-oak-line bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-oak-line px-3 py-2">
              <span className="text-[12px] font-semibold text-oak-ink">Alerts</span>
              <button onClick={markAllRead} className="text-[11px] font-medium text-oak-sage hover:text-oak-ink">
                Mark all read
              </button>
            </div>
            <div className="scrollbar-thin max-h-96 overflow-y-auto">
              {alerts.length === 0 && (
                <div className="px-3 py-6 text-center text-[12px] text-oak-sagelight">No alerts yet.</div>
              )}
              {alerts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleOpenAlert(a)}
                  className={`flex w-full gap-2 border-b border-oak-line/60 px-3 py-2.5 text-left last:border-0 hover:bg-black/[0.02] ${
                    a.read_at ? "" : "bg-oak-gold/[0.08]"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{SOURCE_ICON[a.source_type]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-oak-ink">{a.borrower_name}</div>
                    <div className="text-[12px] text-oak-ink">{a.message}</div>
                    <div className="text-[11px] text-oak-sagelight">{formatDate(a.created_at)}</div>
                  </div>
                  {!a.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-oak-gold" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
