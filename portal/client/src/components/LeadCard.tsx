import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import type { Lead } from "../types";
import { formatCurrency, initials } from "../utils/format";

interface Props {
  lead: Lead;
  onOpen: (lead: Lead) => void;
  onDisqualify: (lead: Lead) => void;
  onMarkLost: (lead: Lead) => void;
  dragOverlay?: boolean;
}

export function LeadCard({ lead, onOpen, onDisqualify, onMarkLost, dragOverlay }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    disabled: dragOverlay,
  });

  const cardBody = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="truncate text-[13px] font-semibold text-oak-ink">{lead.borrower_name}</div>
      </div>
      <div className="mt-1 font-condensed text-lg font-semibold text-oak-dark">
        {formatCurrency(lead.loan_amount)}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <span className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[11px] font-medium text-oak-sage">
          {lead.asset_class}
        </span>
        <span className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[11px] font-medium text-oak-sage">
          {lead.loan_type}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="truncate text-[12px] text-oak-sagelight">
          {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
        </div>
        {lead.assigned_to && (
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-oak-dark text-[10px] font-semibold text-oak-cream"
            title={lead.assigned_to}
          >
            {initials(lead.assigned_to)}
          </div>
        )}
      </div>
    </>
  );

  if (dragOverlay) {
    return (
      <div className="w-[264px] cursor-grabbing rounded-lg border border-oak-gold/60 bg-white p-3 shadow-pop rotate-[1.5deg]">
        {cardBody}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`group relative rounded-lg border bg-white p-3 transition-all duration-150 ${
        isDragging
          ? "border-dashed border-oak-gold/50 opacity-40 shadow-none"
          : "border-oak-line shadow-card hover:-translate-y-0.5 hover:shadow-pop"
      }`}
    >
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none active:cursor-grabbing"
        onClick={() => !isDragging && onOpen(lead)}
      >
        {cardBody}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="absolute right-1.5 top-1.5 rounded p-1 text-oak-sagelight opacity-0 hover:bg-black/[0.05] group-hover:opacity-100"
        aria-label="More actions"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="10" cy="4" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="10" cy="16" r="1.6" />
        </svg>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-1.5 top-8 z-50 w-40 overflow-hidden rounded-md border border-oak-line bg-white shadow-pop">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onOpen(lead);
              }}
              className="block w-full px-3 py-2 text-left text-[13px] text-oak-ink hover:bg-black/[0.04]"
            >
              View details
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDisqualify(lead);
              }}
              className="block w-full px-3 py-2 text-left text-[13px] text-amber-800 hover:bg-black/[0.04]"
            >
              Disqualify
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onMarkLost(lead);
              }}
              className="block w-full px-3 py-2 text-left text-[13px] text-red-700 hover:bg-black/[0.04]"
            >
              Mark Lost
            </button>
          </div>
        </>
      )}
    </div>
  );
}
