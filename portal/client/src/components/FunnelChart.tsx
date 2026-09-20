import { ACTIVE_STAGES } from "../types";
import type { Metrics } from "../types";
import { formatCurrency } from "../utils/format";

interface Props {
  metrics: Metrics | null;
}

export function FunnelChart({ metrics }: Props) {
  if (!metrics) return null;

  const stageMap = new Map(metrics.byStage.map((s) => [s.stage, s]));
  const rows = ACTIVE_STAGES.map((stage) => stageMap.get(stage) ?? { stage, count: 0, totalAmount: 0 });
  const max = Math.max(1, ...rows.map((r) => r.totalAmount));

  return (
    <div className="rounded-xl border border-oak-line bg-white p-5 shadow-card">
      <div className="mb-4 text-[12px] font-medium uppercase tracking-wide text-oak-sage">
        Pipeline funnel · loan request $ by stage
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const widthPct = Math.max(3, (r.totalAmount / max) * 100);
          return (
            <div key={r.stage} className="flex items-center gap-3">
              <div className="w-20 shrink-0 text-[13px] font-medium text-oak-ink">{r.stage}</div>
              <div className="relative flex-1 rounded bg-oak-line/70" style={{ height: 20 }}>
                <div
                  className="h-full rounded bg-oak-gold transition-all"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="w-24 shrink-0 text-right text-[13px] font-semibold text-oak-ink">
                {formatCurrency(r.totalAmount)}
              </div>
              <div className="w-14 shrink-0 text-right text-[12px] text-oak-sagelight">
                {r.count} deal{r.count === 1 ? "" : "s"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
