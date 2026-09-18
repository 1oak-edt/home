import { useAuth } from "../hooks/useAuth";
import { AlertsBell } from "./AlertsBell";

export type ViewKey = "pipeline" | "lost";

interface Props {
  view: ViewKey;
  onViewChange: (v: ViewKey) => void;
  lostCount: number;
  onNewLead: () => void;
  currentUser: string;
  onOpenDealFromAlert: (leadId: string) => void;
}

export function Header({
  view,
  onViewChange,
  lostCount,
  onNewLead,
  currentUser,
  onOpenDealFromAlert,
}: Props) {
  const { signOut } = useAuth();

  function tabClass(active: boolean) {
    return `flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-oak-dark text-oak-cream shadow-card" : "text-oak-sage hover:text-oak-ink"
    }`;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-oak-line bg-oak-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-oak-dark font-condensed text-lg font-semibold text-oak-cream">
            1O
          </div>
          <div className="leading-tight">
            <div className="font-condensed text-lg font-semibold tracking-wide text-oak-dark">
              1OAK CAPITAL
            </div>
            <div className="text-[11px] uppercase tracking-widest text-oak-sage">
              Deal Pipeline
            </div>
          </div>
        </div>

        <nav className="ml-4 flex items-center gap-1 rounded-lg bg-black/[0.03] p-1">
          <button onClick={() => onViewChange("pipeline")} className={tabClass(view === "pipeline")}>
            Pipeline
          </button>
          <button onClick={() => onViewChange("lost")} className={tabClass(view === "lost")}>
            Disqualified &amp; Lost
            {lostCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                  view === "lost" ? "bg-oak-cream/20" : "bg-black/[0.06]"
                }`}
              >
                {lostCount}
              </span>
            )}
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <AlertsBell currentUser={currentUser} onOpenDeal={onOpenDealFromAlert} />
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-oak-ink">
            {currentUser}
            <button
              onClick={() => signOut()}
              className="text-[12px] font-medium text-oak-sage hover:text-oak-ink hover:underline"
            >
              Sign out
            </button>
          </div>
          <button
            onClick={onNewLead}
            className="rounded-md bg-oak-gold px-4 py-2 text-sm font-semibold text-oak-darker shadow-card transition-transform hover:brightness-95 active:scale-[0.98]"
          >
            + New Deal
          </button>
        </div>
      </div>
    </header>
  );
}
