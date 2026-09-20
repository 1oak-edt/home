import type { Metrics } from "../types";
import { formatCurrency, formatFullCurrency } from "../utils/format";

interface Props {
  metrics: Metrics | null;
}

function Tile({
  label,
  value,
  sub,
  title,
}: {
  label: string;
  value: string;
  sub?: string;
  title?: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-oak-line bg-white px-5 py-4 shadow-card" title={title}>
      <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">{label}</div>
      <div className="mt-1.5 font-condensed text-[28px] font-semibold leading-none text-oak-ink">
        {value}
      </div>
      {sub && <div className="mt-1 text-[12px] text-oak-sagelight">{sub}</div>}
    </div>
  );
}

export function MetricsBar({ metrics }: Props) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[86px] flex-1 animate-pulse rounded-xl bg-black/[0.04]" />
        ))}
      </div>
    );
  }

  const winRatePct =
    metrics.winRate === null ? "—" : `${Math.round(metrics.winRate * 100)}%`;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
      <Tile
        label="Active Pipeline"
        value={formatCurrency(metrics.activePipelineAmount)}
        sub="loan request $"
        title={formatFullCurrency(metrics.activePipelineAmount)}
      />
      <Tile label="Active Deals" value={String(metrics.activeDealCount)} sub="Intake → Financed" />
      <Tile
        label="Avg Deal Size"
        value={formatCurrency(metrics.avgDealSize)}
        title={formatFullCurrency(metrics.avgDealSize)}
      />
      <Tile
        label="Financed"
        value={formatCurrency(metrics.financedAmount)}
        sub={`${metrics.financedCount} deal${metrics.financedCount === 1 ? "" : "s"}`}
        title={formatFullCurrency(metrics.financedAmount)}
      />
      <Tile label="Win Rate" value={winRatePct} sub="financed vs. closed out" />
      <Tile
        label="DQ'd / Lost"
        value={String(metrics.closedOutCount)}
        sub={`${metrics.disqualifiedCount} DQ · ${metrics.lostCount} lost`}
      />
    </div>
  );
}
