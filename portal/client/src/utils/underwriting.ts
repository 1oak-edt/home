import type { Lead } from "../types";

// All percentage inputs are stored as plain percent numbers (6.5 = 6.5%), matching Lead.interest_rate.

export const LEASE_TYPES = ["NNN", "Modified Gross", "Full Service / Gross"] as const;
export const VALUE_BASES = ["current", "proforma", "salesComps", "manual"] as const;
export type ValueBasis = (typeof VALUE_BASES)[number];
export const DAY_COUNTS = ["30/360", "Actual/360"] as const;
export type DayCount = (typeof DAY_COUNTS)[number];

// sf is per unit; currentRent and proformaRent are monthly $ per unit. Totals and annual rent multiply out by units.
export interface AssetMixRow {
  id: string;
  type: string;
  sf: number;
  units: number;
  currentRent: number;
  proformaRent: number;
  description: string;
}

export const rowTotalSf = (m: AssetMixRow) => num(m.sf) * num(m.units);
export const rowAnnualRent = (m: AssetMixRow, which: "current" | "proforma") =>
  num(which === "current" ? m.currentRent : m.proformaRent) * num(m.units) * 12;

export function newMixRow(type: string): AssetMixRow {
  return { id: uid(), type, sf: 0, units: 1, currentRent: 0, proformaRent: 0, description: "" };
}

export interface SaleComp {
  id: string;
  address: string;
  type: string;
  saleDate: string;
  price: number;
  sf: number;
  capRate: number;
  include: boolean;
}

export interface RentComp {
  id: string;
  address: string;
  type: string;
  sf: number;
  rentPsf: number;
  leaseType: string;
  include: boolean;
}

export interface PnL {
  grossRent: number;
  reimbursements: number;
  otherIncome: number;
  vacancyPct: number;
  taxes: number;
  insurance: number;
  utilities: number;
  repairs: number;
  contractServices: number;
  payroll: number;
  marketing: number;
  ga: number;
  otherExpenses: number;
  mgmtFeePct: number;
  reserves: number;
}

export interface UseRow {
  id: string;
  label: string;
  amount: number;
}

export interface Underwriting {
  version: 1;
  mix: AssetMixRow[];
  saleComps: SaleComp[];
  rentComps: RentComp[];
  current: PnL;
  proforma: PnL;
  capRateCurrent: number;
  capRateProforma: number;
  valueBasis: ValueBasis;
  manualValue: number;
  ltv: number;
  seniorDebt: number;
  seniorRate: number;
  rate: number;
  termMonths: number;
  interestOnly: boolean;
  amortYears: number;
  dayCount: DayCount;
  originationPct: number;
  exitPct: number;
  interestReserveMonths: number;
  uses: UseRow[];
}

export const INCOME_LINES: { key: keyof PnL; label: string }[] = [
  { key: "grossRent", label: "Base rental income (gross potential rent)" },
  { key: "reimbursements", label: "Expense reimbursements / recoveries" },
  { key: "otherIncome", label: "Other income (parking, laundry, fees)" },
];

export const EXPENSE_LINES: { key: keyof PnL; label: string }[] = [
  { key: "taxes", label: "Real estate taxes" },
  { key: "insurance", label: "Insurance" },
  { key: "utilities", label: "Utilities" },
  { key: "repairs", label: "Repairs & maintenance" },
  { key: "contractServices", label: "Contract services (landscaping, janitorial, security)" },
  { key: "payroll", label: "Payroll & on-site staff" },
  { key: "marketing", label: "Marketing & leasing" },
  { key: "ga", label: "General & administrative" },
  { key: "otherExpenses", label: "Other operating expenses" },
];

export const uid = () => Math.random().toString(36).slice(2, 10);

export function emptyPnL(): PnL {
  return {
    grossRent: 0,
    reimbursements: 0,
    otherIncome: 0,
    vacancyPct: 5,
    taxes: 0,
    insurance: 0,
    utilities: 0,
    repairs: 0,
    contractServices: 0,
    payroll: 0,
    marketing: 0,
    ga: 0,
    otherExpenses: 0,
    mgmtFeePct: 3,
    reserves: 0,
  };
}

export function defaultUnderwriting(lead: Lead): Underwriting {
  const price = lead.purchase_price ?? 0;
  const ltv = price > 0 && lead.loan_amount > 0 ? Math.round((lead.loan_amount / price) * 1000) / 10 : 65;

  const leadUses = (lead.use_of_proceeds ?? []).filter((u) => u.category !== "Interest Reserve" && u.amount > 0);
  const leadAmount = (category: string) => sum(leadUses.filter((u) => u.category === category).map((u) => u.amount));
  const uses: UseRow[] = [
    { id: uid(), label: "Lien Takeout", amount: leadAmount("Lien Pay-Off") },
    { id: uid(), label: "Closing Costs", amount: 0 },
    { id: uid(), label: "Renovation / CapEx", amount: leadAmount("Renovation") },
    ...leadUses
      .filter((u) => u.category !== "Lien Pay-Off" && u.category !== "Renovation")
      .map((u) => ({ id: uid(), label: u.category, amount: u.amount })),
  ];

  return {
    version: 1,
    mix: [newMixRow(lead.asset_class)],
    saleComps: [],
    rentComps: [],
    current: emptyPnL(),
    proforma: emptyPnL(),
    capRateCurrent: 7,
    capRateProforma: 6.5,
    valueBasis: price > 0 ? "manual" : "current",
    manualValue: price,
    ltv,
    seniorDebt: 0,
    seniorRate: 7,
    rate: lead.interest_rate ?? 10,
    termMonths: lead.term_months ?? 12,
    interestOnly: true,
    amortYears: 30,
    dayCount: "Actual/360",
    originationPct: 1,
    exitPct: 0,
    interestReserveMonths: 0,
    uses,
  };
}

const LEGACY_USE_LABELS: Record<string, string> = {
  "Lien pay-off / acquisition": "Lien Takeout",
  "Closing costs & legal": "Closing Costs",
};

// Fills any fields missing from a previously saved document so older saves keep loading as the model grows.
export function normalizeUnderwriting(saved: Partial<Underwriting>, lead: Lead): Underwriting {
  const d = defaultUnderwriting(lead);
  return {
    ...d,
    ...saved,
    version: 1,
    current: { ...d.current, ...saved.current },
    proforma: { ...d.proforma, ...saved.proforma },
    // Older saves entered total SF with optional units; treat missing/zero units as one so their total SF is unchanged.
    mix: saved.mix
      ? saved.mix.map((m) => ({ ...newMixRow(m.type), ...m, units: num(m.units) > 0 ? m.units : 1 }))
      : d.mix,
    saleComps: saved.saleComps ?? [],
    rentComps: saved.rentComps ?? [],
    uses: saved.uses ? saved.uses.map((u) => ({ ...u, label: LEGACY_USE_LABELS[u.label] ?? u.label })) : d.uses,
  };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);
const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);

export interface PnLResult {
  pgi: number;
  vacancy: number;
  egi: number;
  mgmtFee: number;
  totalOpex: number;
  noi: number;
  expenseRatio: number;
}

export function calcPnL(p: PnL): PnLResult {
  const pgi = num(p.grossRent) + num(p.reimbursements) + num(p.otherIncome);
  const vacancy = pgi * (num(p.vacancyPct) / 100);
  const egi = pgi - vacancy;
  const mgmtFee = egi * (num(p.mgmtFeePct) / 100);
  const fixed = sum(EXPENSE_LINES.map((l) => num(p[l.key]))) + num(p.reserves);
  const totalOpex = fixed + mgmtFee;
  return { pgi, vacancy, egi, mgmtFee, totalOpex, noi: egi - totalOpex, expenseRatio: egi > 0 ? totalOpex / egi : 0 };
}

export interface TypeStats {
  type: string;
  sf: number;
  salePsf: number | null;
  saleCap: number | null;
  saleCount: number;
  saleFallback: boolean;
  rentPsf: number | null;
  rentCount: number;
  rentFallback: boolean;
}

export function calcTypeStats(uw: Underwriting): TypeStats[] {
  const sales = uw.saleComps.filter((c) => c.include && num(c.price) > 0 && num(c.sf) > 0);
  const rents = uw.rentComps.filter((c) => c.include && num(c.rentPsf) > 0);
  const types = Array.from(new Set(uw.mix.map((m) => m.type)));

  return types.map((type) => {
    const rowSf = sum(uw.mix.filter((m) => m.type === type).map(rowTotalSf));
    const typedSales = sales.filter((c) => c.type === type);
    const typedRents = rents.filter((c) => c.type === type);
    const saleFallback = typedSales.length === 0 && sales.length > 0;
    const rentFallback = typedRents.length === 0 && rents.length > 0;
    const saleSet = typedSales.length ? typedSales : sales;
    const rentSet = typedRents.length ? typedRents : rents;
    const caps = saleSet.filter((c) => num(c.capRate) > 0).map((c) => c.capRate);
    return {
      type,
      sf: rowSf,
      salePsf: mean(saleSet.map((c) => c.price / c.sf)),
      saleCap: mean(caps),
      saleCount: saleSet.length,
      saleFallback,
      rentPsf: mean(rentSet.map((c) => c.rentPsf)),
      rentCount: rentSet.length,
      rentFallback,
    };
  });
}

export interface MonthRow {
  month: number;
  beginBal: number;
  interest: number;
  principal: number;
  payment: number;
  endBal: number;
}

function monthlyRate(ratePct: number, dayCount: DayCount) {
  return (num(ratePct) / 100 / 12) * (dayCount === "Actual/360" ? 365 / 360 : 1);
}

export function pmt(r: number, n: number, pv: number) {
  if (n <= 0) return 0;
  if (r === 0) return pv / n;
  return (pv * r) / (1 - Math.pow(1 + r, -n));
}

export function buildSchedule(
  loan: number,
  ratePct: number,
  termMonths: number,
  interestOnly: boolean,
  amortYears: number,
  dayCount: DayCount
): MonthRow[] {
  const n = Math.max(0, Math.round(num(termMonths)));
  const r = monthlyRate(ratePct, dayCount);
  const level = interestOnly || num(amortYears) <= 0 ? 0 : pmt(r, Math.round(amortYears * 12), loan);
  const rows: MonthRow[] = [];
  let bal = loan;
  for (let m = 1; m <= n; m++) {
    const interest = bal * r;
    const principal = level > 0 ? Math.min(bal, Math.max(0, level - interest)) : 0;
    const endBal = bal - principal;
    rows.push({ month: m, beginBal: bal, interest, principal, payment: interest + principal, endBal });
    bal = endBal;
  }
  return rows;
}

// Monthly IRR by bisection; cash flows are one initial outflow followed by inflows so NPV falls monotonically with rate.
export function irr(cashFlows: number[]): number | null {
  const npv = (rate: number) => cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
  let lo = -0.9;
  let hi = 1;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface YearRow {
  year: number;
  interest: number;
  principal: number;
  debtService: number;
  endBal: number;
  dscrCurrent: number | null;
  dscrProforma: number | null;
}

export interface UwResult {
  current: PnLResult;
  proforma: PnLResult;
  subjectSf: number;
  subjectUnits: number;
  mixRent: { current: number; proforma: number };
  grossRentFromMix: { current: boolean; proforma: boolean };
  effectiveGrossRent: { current: number; proforma: number };
  typeStats: TypeStats[];
  salesCompValue: number;
  compWeightedCap: number | null;
  marketRent: number;
  valueCurrent: number;
  valueProforma: number;
  value: number;
  valueBasisLabel: string;
  loan: number;
  attachLtv: number;
  detachLtv: number;
  stabilizedLtv: number;
  valuePsf: number;
  loanPsf: number;
  debtYieldCurrent: number | null;
  debtYieldProforma: number | null;
  seniorInterest: number;
  schedule: MonthRow[];
  years: YearRow[];
  firstYearDebtService: number;
  dscrCurrent: number | null;
  dscrProforma: number | null;
  origFee: number;
  exitFee: number;
  interestReserve: number;
  usesTotal: number;
  usesBalance: number;
  totalInterest: number;
  balloon: number;
  netFunding: number;
  irrMonthly: number | null;
  yieldEffective: number | null;
  yieldNominal: number | null;
  moic: number | null;
  totalProfit: number;
  sensitivity: { cap: number; valueCurrent: number; valueProforma: number; ltvCurrent: number | null; ltvProforma: number | null }[];
}

export const BASIS_LABELS: Record<ValueBasis, string> = {
  current: "Direct cap — current NOI",
  proforma: "Direct cap — pro forma NOI",
  salesComps: "Sales comparison ($/SF)",
  manual: "Purchase price / manual value",
};

export function computeUnderwriting(uw: Underwriting): UwResult {
  // Rent entered in the asset mix drives base rental income; the P&L field is only used when the mix has none.
  const mixRent = {
    current: sum(uw.mix.map((m) => rowAnnualRent(m, "current"))),
    proforma: sum(uw.mix.map((m) => rowAnnualRent(m, "proforma"))),
  };
  const grossRentFromMix = { current: mixRent.current > 0, proforma: mixRent.proforma > 0 };
  const effectiveGrossRent = {
    current: grossRentFromMix.current ? mixRent.current : num(uw.current.grossRent),
    proforma: grossRentFromMix.proforma ? mixRent.proforma : num(uw.proforma.grossRent),
  };
  const current = calcPnL({ ...uw.current, grossRent: effectiveGrossRent.current });
  const proforma = calcPnL({ ...uw.proforma, grossRent: effectiveGrossRent.proforma });
  const subjectSf = sum(uw.mix.map(rowTotalSf));
  const subjectUnits = sum(uw.mix.map((m) => num(m.units)));

  const typeStats = calcTypeStats(uw);
  const salesCompValue = sum(typeStats.map((t) => (t.salePsf ?? 0) * t.sf));
  const marketRent = sum(typeStats.map((t) => (t.rentPsf ?? 0) * t.sf));
  const capWeights = typeStats.filter((t) => t.saleCap != null && t.sf > 0);
  const capSf = sum(capWeights.map((t) => t.sf));
  const compWeightedCap = capSf > 0 ? sum(capWeights.map((t) => (t.saleCap as number) * t.sf)) / capSf : null;

  const valueAt = (noi: number, cap: number) => (cap > 0 ? noi / (cap / 100) : 0);
  const valueCurrent = valueAt(current.noi, uw.capRateCurrent);
  const valueProforma = valueAt(proforma.noi, uw.capRateProforma);
  const valueByBasis: Record<ValueBasis, number> = {
    current: valueCurrent,
    proforma: valueProforma,
    salesComps: salesCompValue,
    manual: num(uw.manualValue),
  };
  const value = valueByBasis[uw.valueBasis];

  const senior = num(uw.seniorDebt);
  const loan = Math.max(0, (num(uw.ltv) / 100) * value - senior);
  const pct = (x: number, base: number) => (base > 0 ? x / base : 0);
  const stabilizedBase = valueProforma > 0 ? valueProforma : value;

  const schedule = buildSchedule(loan, uw.rate, uw.termMonths, uw.interestOnly, uw.amortYears, uw.dayCount);
  const years: YearRow[] = [];
  const seniorInterest = senior * (num(uw.seniorRate) / 100);
  for (let y = 0; y * 12 < schedule.length; y++) {
    const slice = schedule.slice(y * 12, y * 12 + 12);
    const interest = sum(slice.map((r) => r.interest));
    const principal = sum(slice.map((r) => r.principal));
    // Scale a short final year up to a full year so coverage ratios stay comparable.
    const annualize = 12 / slice.length;
    const ds = (interest + principal) * annualize + seniorInterest;
    years.push({
      year: y + 1,
      interest,
      principal,
      debtService: interest + principal,
      endBal: slice[slice.length - 1].endBal,
      dscrCurrent: ds > 0 ? current.noi / ds : null,
      dscrProforma: ds > 0 ? proforma.noi / ds : null,
    });
  }

  const firstYear = schedule.slice(0, 12);
  const firstYearDebtService = sum(firstYear.map((r) => r.payment)) * (firstYear.length ? 12 / firstYear.length : 0);
  const totalDs = firstYearDebtService + seniorInterest;
  const totalDebt = senior + loan;

  const origFee = loan * (num(uw.originationPct) / 100);
  const exitFee = loan * (num(uw.exitPct) / 100);
  const reserveMonths = Math.min(Math.max(0, Math.round(num(uw.interestReserveMonths))), schedule.length);
  const interestReserve = sum(schedule.slice(0, reserveMonths).map((r) => r.interest));
  const usesTotal = origFee + interestReserve + sum(uw.uses.map((u) => num(u.amount)));

  const balloon = schedule.length ? schedule[schedule.length - 1].endBal : loan;
  const totalInterest = sum(schedule.map((r) => r.interest));
  const netFunding = loan - origFee;
  let irrMonthly: number | null = null;
  let moic: number | null = null;
  if (loan > 0 && netFunding > 0 && schedule.length > 0) {
    const flows = [-netFunding, ...schedule.map((r) => r.payment)];
    flows[flows.length - 1] += balloon + exitFee;
    irrMonthly = irr(flows);
    moic = sum(flows.slice(1)) / netFunding;
  }
  const totalProfit = totalInterest + origFee + exitFee;

  const baseCap = uw.valueBasis === "proforma" ? uw.capRateProforma : uw.capRateCurrent;
  const sensitivity = [-1, -0.5, 0, 0.5, 1].map((delta) => {
    const cap = Math.max(0.5, baseCap + delta);
    const vc = valueAt(current.noi, cap);
    const vp = valueAt(proforma.noi, cap);
    return {
      cap,
      valueCurrent: vc,
      valueProforma: vp,
      ltvCurrent: vc > 0 ? totalDebt / vc : null,
      ltvProforma: vp > 0 ? totalDebt / vp : null,
    };
  });

  return {
    current,
    proforma,
    subjectSf,
    subjectUnits,
    mixRent,
    grossRentFromMix,
    effectiveGrossRent,
    typeStats,
    salesCompValue,
    compWeightedCap,
    marketRent,
    valueCurrent,
    valueProforma,
    value,
    valueBasisLabel: BASIS_LABELS[uw.valueBasis],
    loan,
    attachLtv: pct(senior, value),
    detachLtv: pct(totalDebt, value),
    stabilizedLtv: pct(totalDebt, stabilizedBase),
    valuePsf: subjectSf > 0 ? value / subjectSf : 0,
    loanPsf: subjectSf > 0 ? loan / subjectSf : 0,
    debtYieldCurrent: totalDebt > 0 ? current.noi / totalDebt : null,
    debtYieldProforma: totalDebt > 0 ? proforma.noi / totalDebt : null,
    seniorInterest,
    schedule,
    years,
    firstYearDebtService,
    dscrCurrent: totalDs > 0 ? current.noi / totalDs : null,
    dscrProforma: totalDs > 0 ? proforma.noi / totalDs : null,
    origFee,
    exitFee,
    interestReserve,
    usesTotal,
    usesBalance: Math.abs(loan - usesTotal) < 0.5 ? 0 : loan - usesTotal,
    totalInterest,
    balloon,
    netFunding,
    irrMonthly,
    yieldEffective: irrMonthly == null ? null : Math.pow(1 + irrMonthly, 12) - 1,
    yieldNominal: irrMonthly == null ? null : irrMonthly * 12,
    moic,
    totalProfit,
    sensitivity,
  };
}
