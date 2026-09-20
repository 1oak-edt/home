import { USE_OF_PROCEEDS_CATEGORIES, type UseOfProceedsItem } from "../types";
import { formatFullCurrency } from "../utils/format";

interface Props {
  value: UseOfProceedsItem[];
  onChange: (items: UseOfProceedsItem[]) => void;
}

const rowInputCls =
  "rounded-md border border-oak-line bg-white px-2.5 py-1.5 text-sm focus:border-oak-sage focus:outline-none";

export function UseOfProceedsInput({ value, onChange }: Props) {
  function updateRow(idx: number, patch: Partial<UseOfProceedsItem>) {
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...value, { category: USE_OF_PROCEEDS_CATEGORIES[0], amount: 0 }]);
  }

  function removeRow(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  const total = value.reduce((acc, r) => acc + (Number.isFinite(r.amount) ? r.amount : 0), 0);

  return (
    <div>
      <div className="flex flex-col gap-2">
        {value.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              className={`${rowInputCls} flex-1`}
              value={row.category}
              onChange={(e) => updateRow(idx, { category: e.target.value })}
            >
              {USE_OF_PROCEEDS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="relative w-40">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-oak-sagelight">
                $
              </span>
              <input
                className={`${rowInputCls} w-full pl-5`}
                value={row.amount === 0 ? "" : String(row.amount)}
                onChange={(e) =>
                  updateRow(idx, { amount: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })
                }
                placeholder="0"
                inputMode="decimal"
              />
            </div>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="rounded-md p-1.5 text-oak-sagelight hover:bg-black/[0.04] hover:text-red-700"
              aria-label="Remove line"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="text-[12px] font-semibold text-oak-sage hover:text-oak-ink"
        >
          + Add line
        </button>
        {value.length > 0 && (
          <div className="text-[12px] text-oak-sagelight">
            Total: <span className="font-semibold text-oak-ink">{formatFullCurrency(total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
