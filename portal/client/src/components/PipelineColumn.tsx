import { useDroppable } from "@dnd-kit/core";
import type { Lead, Stage } from "../types";
import { formatCurrency } from "../utils/format";
import { STAGE_HEX } from "../utils/stageColors";
import { LeadCard } from "./LeadCard";

interface Props {
  stage: Stage;
  leads: Lead[];
  onOpen: (lead: Lead) => void;
  onDisqualify: (lead: Lead) => void;
  onMarkLost: (lead: Lead) => void;
}

export function PipelineColumn({ stage, leads, onOpen, onDisqualify, onMarkLost }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = leads.reduce((acc, l) => acc + l.loan_amount, 0);

  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: STAGE_HEX[stage] ?? "#5A6350" }}
        />
        <div className="text-[13px] font-semibold text-oak-ink">{stage}</div>
        <div className="text-[12px] text-oak-sagelight">{leads.length}</div>
        <div className="ml-auto text-[12px] font-medium text-oak-sage">{formatCurrency(total)}</div>
      </div>
      <div
        ref={setNodeRef}
        className={`scrollbar-thin flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto rounded-lg p-2 transition-all duration-150 ${
          isOver ? "bg-oak-gold/15 ring-2 ring-inset ring-oak-gold/60" : "bg-black/[0.02] ring-2 ring-inset ring-transparent"
        }`}
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onOpen={onOpen}
            onDisqualify={onDisqualify}
            onMarkLost={onMarkLost}
          />
        ))}
        {leads.length === 0 && (
          <div
            className={`rounded-lg border border-dashed py-8 text-center text-[12px] transition-colors ${
              isOver ? "border-oak-gold text-oak-sage" : "border-oak-line/80 text-oak-sagelight"
            }`}
          >
            No deals
          </div>
        )}
      </div>
    </div>
  );
}
