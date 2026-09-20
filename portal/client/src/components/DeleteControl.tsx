import { useState } from "react";

type Tone = "light" | "dark";

// "Delete" link that asks for confirmation before running the delete. The caller reports failures; this just resets.
export function DeleteControl({ onDelete, tone = "light" }: { onDelete: () => Promise<void>; tone?: Tone }) {
  const [state, setState] = useState<"idle" | "confirm" | "busy">("idle");

  const muted = tone === "dark" ? "text-oak-cream/60 hover:text-oak-cream" : "text-oak-sagelight hover:text-oak-ink";
  const danger = tone === "dark" ? "text-red-300 hover:text-red-200" : "text-red-700 hover:text-red-900";

  async function confirm() {
    setState("busy");
    try {
      await onDelete();
    } catch {
      setState("idle");
    }
  }

  if (state === "busy") return <span className={`text-[10px] ${muted}`}>Deleting…</span>;

  if (state === "confirm") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px]">
        <span className={muted}>Delete this?</span>
        <button onClick={confirm} className={`font-semibold underline ${danger}`}>
          Yes
        </button>
        <button onClick={() => setState("idle")} className={`underline ${muted}`}>
          No
        </button>
      </span>
    );
  }

  return (
    <button onClick={() => setState("confirm")} className={`text-[10px] underline-offset-2 hover:underline ${muted}`}>
      Delete
    </button>
  );
}
