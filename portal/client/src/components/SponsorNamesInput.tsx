import { useState } from "react";

interface Props {
  value: string[];
  onChange: (names: string[]) => void;
}

export function SponsorNamesInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function commit() {
    const name = draft.replace(/,+$/, "").trim();
    if (!name) return;
    if (!value.includes(name)) onChange([...value, name]);
    setDraft("");
  }

  function remove(name: string) {
    onChange(value.filter((n) => n !== name));
  }

  return (
    <div className="rounded-md border border-oak-line bg-white px-2 py-1.5">
      <div className="flex flex-wrap gap-1.5">
        {value.map((name) => (
          <span
            key={name}
            className="flex items-center gap-1 rounded-full bg-oak-dark/[0.06] px-2.5 py-1 text-[12px] font-medium text-oak-ink"
          >
            {name}
            <button
              type="button"
              onClick={() => remove(name)}
              className="text-oak-sagelight hover:text-red-700"
              aria-label={`Remove ${name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={commit}
          placeholder={value.length === 0 ? "Type a name, press Enter..." : "Add another..."}
          className="min-w-[140px] flex-1 border-none px-1 py-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}
