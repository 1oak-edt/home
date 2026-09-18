import { useState } from "react";
import { APP_USERS } from "../types";

interface Props {
  currentUser: string;
  selected: string[];
  onChange: (names: string[]) => void;
}

export function NotifySelect({ currentUser, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const others = APP_USERS.filter((u) => u !== currentUser);

  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
          selected.length > 0
            ? "border-oak-gold bg-oak-gold/15 text-oak-darker"
            : "border-oak-line text-oak-sagelight hover:border-oak-sage hover:text-oak-sage"
        }`}
      >
        <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a5 5 0 00-5 5v2.2c0 .9-.3 1.8-.9 2.5L3 13.5c-.5.6 0 1.5.8 1.5h12.4c.8 0 1.3-.9.8-1.5l-1.1-1.8a4.1 4.1 0 01-.9-2.5V7a5 5 0 00-5-5z" />
          <path d="M8 16a2 2 0 004 0H8z" />
        </svg>
        {selected.length > 0 ? `Notify ${selected.length}` : "Notify"}
      </button>
      {open &&
        others.map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => toggle(u)}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              selected.includes(u)
                ? "border-oak-dark bg-oak-dark text-oak-cream"
                : "border-oak-line text-oak-sage hover:border-oak-sage hover:text-oak-ink"
            }`}
          >
            {u}
          </button>
        ))}
    </div>
  );
}
