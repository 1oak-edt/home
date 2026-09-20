import type { Lead } from "../types";
import { formatCurrency, formatDate } from "../utils/format";

interface Props {
  leads: Lead[];
  onOpen: (lead: Lead) => void;
  onReactivate: (lead: Lead) => void;
}

export function LostDeals({ leads, onOpen, onReactivate }: Props) {
  const sorted = [...leads].sort(
    (a, b) => new Date(b.stage_changed_at).getTime() - new Date(a.stage_changed_at).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-oak-line bg-white/50 py-16 text-center text-oak-sagelight">
        No disqualified or lost deals yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-oak-line bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-oak-line bg-black/[0.02] text-[11px] uppercase tracking-wide text-oak-sage">
          <tr>
            <th className="px-4 py-2.5 font-medium">Borrower</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Asset Class</th>
            <th className="px-4 py-2.5 font-medium">Loan Request</th>
            <th className="px-4 py-2.5 font-medium">Fell From</th>
            <th className="px-4 py-2.5 font-medium">Reason</th>
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((lead) => (
            <tr
              key={lead.id}
              className="cursor-pointer border-b border-oak-line/60 last:border-0 hover:bg-black/[0.015]"
              onClick={() => onOpen(lead)}
            >
              <td className="px-4 py-3 font-medium text-oak-ink">{lead.borrower_name}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                    lead.stage === "Disqualified"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {lead.stage}
                </span>
              </td>
              <td className="px-4 py-3 text-oak-sage">{lead.asset_class}</td>
              <td className="px-4 py-3 tabular-nums text-oak-ink">{formatCurrency(lead.loan_amount)}</td>
              <td className="px-4 py-3 text-oak-sagelight">{lead.prior_stage ?? "—"}</td>
              <td className="max-w-[280px] truncate px-4 py-3 text-oak-sagelight" title={lead.lost_reason ?? ""}>
                {lead.lost_reason ?? "—"}
              </td>
              <td className="px-4 py-3 tabular-nums text-oak-sagelight">{formatDate(lead.stage_changed_at)}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReactivate(lead);
                  }}
                  className="rounded-md border border-oak-line px-2.5 py-1 text-[12px] font-medium text-oak-sage hover:border-oak-sage hover:text-oak-ink"
                >
                  Reactivate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
