import { useState, type ReactNode } from "react";

const cellInput =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-oak-ink hover:border-oak-line focus:border-oak-sage focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:text-oak-sagelight";

interface NumFieldProps {
  value: number;
  onChange: (n: number) => void;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

// Keeps the raw text while focused so partial input like "6." or "-" isn't reformatted mid-typing.
export function NumField({ value, onChange, decimals = 0, prefix, suffix, disabled, className = "", ariaLabel }: NumFieldProps) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");

  const formatted = Number.isFinite(value)
    ? value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals })
    : "";
  const display = value === 0 ? "" : `${prefix ?? ""}${formatted}${suffix ?? ""}`;

  return (
    <div className={className}>
      <input
        inputMode="decimal"
        aria-label={ariaLabel}
        disabled={disabled}
        className={`${cellInput} text-right tabular-nums`}
        value={focused ? text : display}
        placeholder={`${prefix ?? ""}0${suffix ?? ""}`}
        onFocus={() => {
          setText(value === 0 ? "" : String(value));
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseFloat(e.target.value.replace(/,/g, ""));
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      type={type}
      aria-label={ariaLabel}
      className={`${cellInput} ${className}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function SelectField({
  value,
  onChange,
  options,
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className={`${cellInput} ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-oak-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-oak-line px-4 py-2.5">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-oak-sage">{title}</h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Tile({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-oak-line bg-white px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-oak-sagelight">{label}</div>
      <div className={`mt-0.5 font-condensed text-xl font-semibold tabular-nums ${warn ? "text-red-700" : "text-oak-ink"}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-oak-sagelight">{sub}</div>}
    </div>
  );
}

export const th = "px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-oak-sage";
export const thR = `${th} text-right`;
export const td = "px-2 py-1 text-[13px] text-oak-ink";
export const tdR = `${td} text-right tabular-nums`;

export function SmallButton({
  onClick,
  children,
  title,
  danger,
}: {
  onClick: () => void;
  children: ReactNode;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold ${
        danger
          ? "border-transparent text-oak-sagelight hover:text-red-700"
          : "border-oak-line text-oak-sage hover:border-oak-sage hover:text-oak-ink"
      }`}
    >
      {children}
    </button>
  );
}
