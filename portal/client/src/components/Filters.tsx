import { ASSET_CLASSES, LOAN_TYPES } from "../types";

export interface FilterState {
  search: string;
  assetClass: string;
  loanType: string;
  assignedTo: string;
}

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  assignees: string[];
}

const baseSelect =
  "rounded-md border border-oak-line bg-white px-3 py-2 text-sm text-oak-ink focus:border-oak-sage focus:outline-none";

export function Filters({ filters, onChange, assignees }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="Search borrower, contact, city..."
        className={`${baseSelect} w-64`}
      />
      <select
        value={filters.assetClass}
        onChange={(e) => onChange({ ...filters, assetClass: e.target.value })}
        className={baseSelect}
      >
        <option value="">All asset classes</option>
        {ASSET_CLASSES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={filters.loanType}
        onChange={(e) => onChange({ ...filters, loanType: e.target.value })}
        className={baseSelect}
      >
        <option value="">All loan types</option>
        {LOAN_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select
        value={filters.assignedTo}
        onChange={(e) => onChange({ ...filters, assignedTo: e.target.value })}
        className={baseSelect}
      >
        <option value="">All reps</option>
        {assignees.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      {(filters.search || filters.assetClass || filters.loanType || filters.assignedTo) && (
        <button
          onClick={() => onChange({ search: "", assetClass: "", loanType: "", assignedTo: "" })}
          className="text-sm font-medium text-oak-sage underline-offset-2 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
