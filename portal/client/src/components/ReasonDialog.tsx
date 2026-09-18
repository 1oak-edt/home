import { useState } from "react";
import type { Lead } from "../types";
import { Modal } from "./Modal";

interface Props {
  lead: Lead;
  kind: "Disqualified" | "Lost";
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function ReasonDialog({ lead, kind, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const verb = kind === "Disqualified" ? "Disqualify" : "Mark as Lost";

  return (
    <Modal onClose={onCancel} widthClass="max-w-md">
      <div className="p-5">
        <div className="font-condensed text-xl font-semibold text-oak-ink">{verb}</div>
        <div className="mt-1 text-sm text-oak-sage">{lead.borrower_name}</div>
        <label className="mt-4 block text-[12px] font-medium uppercase tracking-wide text-oak-sage">
          Reason
        </label>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder={
            kind === "Disqualified"
              ? "e.g. LTV exceeds program max, sponsor liquidity insufficient..."
              : "e.g. Borrower took a lower rate elsewhere, deal fell through..."
          }
          className="mt-1.5 w-full rounded-md border border-oak-line bg-white px-3 py-2 text-sm focus:border-oak-sage focus:outline-none"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-oak-sage hover:bg-black/[0.04]"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${
              kind === "Disqualified" ? "bg-amber-700 hover:bg-amber-800" : "bg-red-700 hover:bg-red-800"
            }`}
          >
            {verb}
          </button>
        </div>
      </div>
    </Modal>
  );
}
