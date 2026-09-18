export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toLocaleString(undefined, { maximumFractionDigits: 0 })}K`;
  }
  return `$${amount.toLocaleString()}`;
}

export function formatFullCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeDays(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

const CAPITALIZED_UOP_COST_CATEGORIES = ["Renovation", "Construction", "Interest Reserve"];

export function computeLtvLtc(
  loanAmount: number,
  purchasePrice: number | null | undefined,
  useOfProceeds: { category: string; amount: number }[]
): { ltv: number | null; ltc: number | null } {
  if (!purchasePrice || purchasePrice <= 0) return { ltv: null, ltc: null };
  const ltv = loanAmount / purchasePrice;
  const capitalizedCosts = useOfProceeds
    .filter((r) => CAPITALIZED_UOP_COST_CATEGORIES.includes(r.category))
    .reduce((acc, r) => acc + (r.amount || 0), 0);
  const totalCost = purchasePrice + capitalizedCosts;
  const ltc = totalCost > 0 ? loanAmount / totalCost : null;
  return { ltv, ltc };
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function initials(name: string | null): string {
  if (!name) return "—";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
