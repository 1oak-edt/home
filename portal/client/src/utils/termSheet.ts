import type { Lead } from "../types";
import type { Underwriting } from "./underwriting";

export type FieldKind = "text" | "money" | "pct" | "int" | "date" | "long" | "month";
export type FieldGroup = "extension" | "holdback";

export interface FieldDef {
  label: string;
  kind: FieldKind;
  placeholder: string;
  group?: FieldGroup;
  // Money fields normally show cents ($8,500,000.00); this one reads as a round figure ($1,000,000) unless it has cents.
  wholeDollars?: boolean;
}

const f = (label: string, kind: FieldKind, placeholder: string, group?: FieldGroup, wholeDollars?: boolean): FieldDef => ({
  label,
  kind,
  placeholder,
  group,
  wholeDollars,
});

// Every deal-specific value in the term sheet. 1Oak Capital, LLC / 1Oak Capital are deliberately not fields.
export const FIELDS = {
  letterheadLine1: f("1Oak mailing address, line 1", "text", "Street / P.O. Box"),
  letterheadLine2: f("1Oak mailing address, line 2", "text", "City, State ZIP"),
  date: f("Letter date", "date", "Date"),
  addresseeName: f("Addressee name", "text", "Addressee name"),
  addressLine1: f("Addressee address, line 1", "text", "Address Line 1"),
  addressLine2: f("Addressee address, line 2", "text", "City, State ZIP"),
  salutationName: f("Salutation name", "text", "Mr./Ms. Last Name"),
  borrower: f("Borrower (LLC)", "text", "Borrower LLC"),
  borrowerEntity: f("Borrower entity description", "text", "a Texas limited liability company"),
  propertyAddress: f("Property address", "text", "Property address"),
  propertyName: f("Property common name", "text", "Property name"),
  propertyDescription: f("Property description", "text", "approximately 196 multifamily units"),
  loanAmount: f("Loan amount", "money", "Loan amount"),
  allocation: f("Loan amount allocation", "long", "(i) $0 for ...; and (ii) $0 for ..."),
  useOfProceeds: f("Use of proceeds", "long", "Describe how the loan proceeds will be used..."),
  termMonths: f("Term (months)", "int", "#"),
  extCount: f("Number of extension options", "int", "#", "extension"),
  extMonths: f("Extension length (months)", "int", "#", "extension"),
  extFeePct: f("Extension fee (%)", "pct", "%", "extension"),
  ratePct: f("Interest rate (%)", "pct", "%"),
  dayCount: f("Interest calculation methodology", "text", "365/360"),
  exampleMonth: f("Example closing month", "month", "Month"),
  minInterestMonths: f("Minimum interest (months)", "int", "#"),
  originationPct: f("Origination fee (%)", "pct", "%"),
  exitPct: f("Exit fee (%)", "pct", "%"),
  noteHolder: f("Existing lender (full legal name)", "text", "Existing lender, full legal name"),
  noteHolderShort: f("Existing lender (short name)", "text", "Existing lender"),
  pledgePct: f("Membership interests pledged (%)", "pct", "%"),
  holdbackAmount: f("Construction holdback amount", "money", "Holdback amount", "holdback", true),
  advanceAmount: f("Non-refundable advance", "money", "Advance amount"),
  titleEndorsements: f("Required title endorsements", "text", "Texas Form T-19, T-19.1"),
  priorOwners: f("Prior owner entities", "text", "Prior owner LLC(s)"),
  juniorLienholder: f("Junior lienholder", "text", "Junior lienholder"),
  coopDate: f("Cooperation Agreement date", "text", "month, year"),
  coopOtherParties: f("Other Cooperation Agreement parties", "text", "Other parties to the agreement"),
  maxLtvPct: f("Maximum LTV to as-is value (%)", "pct", "%"),
  govState: f("Governing law state", "text", "State"),
  venueCounty: f("Venue county", "text", "County"),
  bankruptcyCaseNo: f("Bankruptcy case number", "text", "Case No."),
  titleCommitmentRef: f("Title commitment reference", "text", "Title company GF No."),
  reportDays: f("Reporting deadline (days)", "int", "#"),
  responseDate: f("Response deadline", "date", "Date"),
  lenderSignatory: f("1Oak signatory name", "text", "Signatory name"),
  borrowerSignatory: f("Borrower signatory name", "text", "Signatory name"),
  borrowerTitle: f("Borrower signatory title", "text", "Title"),
} satisfies Record<string, FieldDef>;

export type FieldKey = keyof typeof FIELDS;

export interface TermSheetData {
  version: 1;
  values: Record<string, string>;
  guarantors: string[];
  includeExtension: boolean;
  includeHoldback: boolean;
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

const stateName = (s: string | null) => (s ? STATE_NAMES[s.trim().toUpperCase()] ?? s.trim() : "");

// ---- number formatting and wording -----------------------------------------------------------

export function parseNum(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export const formatMoney = (n: number, wholeDollars = false) => {
  const cents = !(wholeDollars && Number.isInteger(n));
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;
};

export const formatPct = (n: number) => `${Number(n.toFixed(4))}%`;

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES = ["", "thousand", "million", "billion", "trillion"];

function underThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(n % 10 ? `${TENS[Math.floor(n / 10)]}-${ONES[n % 10]}` : TENS[Math.floor(n / 10)]);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) return String(n);
  if (n === 0) return "zero";
  const groups: string[] = [];
  for (let scale = 0; n > 0; scale++) {
    const chunk = n % 1000;
    if (chunk) groups.unshift(`${underThousand(chunk)}${SCALES[scale] ? ` ${SCALES[scale]}` : ""}`);
    n = Math.floor(n / 1000);
  }
  return groups.join(" ");
}

const capitalize = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

export const countWord = (n: number, cap: boolean) => (cap ? capitalize(numberToWords(n)) : numberToWords(n));

export function percentWords(p: number, cap: boolean): string {
  const whole = Math.trunc(p);
  const decimals = String(Number(p.toFixed(4))).split(".")[1];
  const spoken = decimals
    ? `${numberToWords(whole)} point ${decimals.split("").map((d) => ONES[Number(d)]).join(" ")}`
    : numberToWords(whole);
  return `${cap ? capitalize(spoken) : spoken} percent`;
}

// "legal" spells out the cents as "and No/100"; "plain" only adds cents when there are some.
export function dollarsInWords(amount: number, style: "legal" | "plain"): string {
  const cents = Math.round(amount * 100);
  const dollars = Math.floor(cents / 100);
  const cc = cents % 100;
  const base = titleCase(numberToWords(dollars));
  if (cc === 0) return style === "legal" ? `${base} and No/100 Dollars` : `${base} Dollars`;
  return `${base} and ${String(cc).padStart(2, "0")}/100 Dollars`;
}

export function formatLongDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function joinNames(names: string[]): string {
  const list = names.map((n) => n.trim()).filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

// ---- defaults from the deal ---------------------------------------------------------------------

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];

function enumerate(items: string[]): string {
  const numbered = items.map((t, i) => `(${ROMAN[i] ?? i + 1}) ${t}`);
  if (numbered.length <= 1) return numbered.join("");
  return `${numbered.slice(0, -1).join("; ")}; and ${numbered[numbered.length - 1]}`;
}

const todayIso = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Deal-specific fields start from the deal record (and saved underwriting); 1Oak's usual terms start at their usual values.
export function defaultTermSheet(lead: Lead, uw: Underwriting | null): TermSheetData {
  const uses = (lead.use_of_proceeds ?? []).filter((u) => u.amount > 0);
  const holdback = uses
    .filter((u) => u.category === "Renovation" || u.category === "Construction")
    .reduce((sum, u) => sum + u.amount, 0);
  const num = (n: number | null | undefined) => (n == null ? "" : String(n));

  const values: Record<string, string> = {
    letterheadLine1: "P.O. Box 393",
    letterheadLine2: "Farmington, NM 87499",
    date: todayIso(),
    responseDate: todayIso(7),
    addresseeName: lead.contact_name ?? "",
    addressLine1: "",
    addressLine2: "",
    salutationName: "",
    borrower: lead.borrower_name,
    borrowerEntity: "",
    propertyAddress: [lead.property_address, lead.city, stateName(lead.state)].filter(Boolean).join(", "),
    propertyName: "",
    propertyDescription: "",
    loanAmount: lead.loan_amount > 0 ? String(lead.loan_amount) : "",
    allocation: enumerate(uses.map((u) => `$${u.amount.toLocaleString("en-US")} for ${u.category.toLowerCase()}`)),
    useOfProceeds: uses.length ? `${enumerate(uses.map((u) => u.category))}.` : "",
    termMonths: num(lead.term_months),
    extCount: "1",
    extMonths: "6",
    extFeePct: "1",
    ratePct: num(lead.interest_rate),
    dayCount: "365/360",
    exampleMonth: MONTHS[new Date().getMonth()],
    minInterestMonths: "9",
    originationPct: uw ? String(uw.originationPct) : "1",
    exitPct: uw ? String(uw.exitPct) : "1",
    noteHolder: "",
    noteHolderShort: "",
    pledgePct: "100",
    holdbackAmount: holdback > 0 ? String(holdback) : "",
    advanceAmount: "15000",
    titleEndorsements: "",
    priorOwners: "",
    juniorLienholder: "",
    coopDate: "",
    coopOtherParties: "",
    maxLtvPct: uw ? String(uw.ltv) : "68",
    govState: stateName(lead.state),
    venueCounty: "",
    bankruptcyCaseNo: "",
    titleCommitmentRef: "",
    reportDays: "15",
    lenderSignatory: "Charlie Thomas",
    borrowerSignatory: lead.contact_name ?? "",
    borrowerTitle: "Authorized Signatory",
  };

  return {
    version: 1,
    values,
    guarantors: (lead.sponsor_names ?? []).filter(Boolean),
    includeExtension: true,
    includeHoldback: true,
  };
}

// Saved sheets keep their values; any field added later falls back to its default.
export function normalizeTermSheet(saved: Partial<TermSheetData>, defaults: TermSheetData): TermSheetData {
  return {
    version: 1,
    values: { ...defaults.values, ...saved.values },
    guarantors: saved.guarantors ?? defaults.guarantors,
    includeExtension: saved.includeExtension ?? true,
    includeHoldback: saved.includeHoldback ?? true,
  };
}

export function emptyFieldKeys(data: TermSheetData): FieldKey[] {
  return (Object.keys(FIELDS) as FieldKey[]).filter((k) => {
    const group = (FIELDS[k] as FieldDef).group;
    if (group === "extension" && !data.includeExtension) return false;
    if (group === "holdback" && !data.includeHoldback) return false;
    return !(data.values[k] ?? "").trim();
  });
}

// ---- computed wording shared by the on-screen letter and the PDF ----------------------------------

export type WordsKind = "count" | "pct" | "dollars";

// Returns null when the number isn't filled in yet, so callers can show their own blank marker.
export function wordsText(kind: WordsKind, n: number | null, cap: boolean, style: "legal" | "plain"): string | null {
  if (n === null) return null;
  if (kind === "dollars") return dollarsInWords(n, style);
  if (kind === "pct") return percentWords(n, cap);
  return countWord(n, cap);
}

export function totalFeesText(values: Record<string, string>): string | null {
  const orig = parseNum(values.originationPct);
  const exit = parseNum(values.exitPct);
  if (orig === null || exit === null) return null;
  return `${percentWords(orig + exit, true)} (${formatPct(orig + exit)})`;
}

// First interest payment falls on the first of the second calendar month after closing.
export function firstPaymentMonth(values: Record<string, string>): string | null {
  const i = MONTHS.indexOf(values.exampleMonth ?? "");
  return i === -1 ? null : MONTHS[(i + 2) % 12];
}

export function guarantorSuffix(guarantors: string[]): string {
  return guarantors.filter((g) => g.trim()).length > 1
    ? ", jointly and severally, on a full recourse basis"
    : ", on a full recourse basis";
}
