import {
  FIELDS,
  formatLongDate,
  formatMoney,
  formatPct,
  countWord,
  firstPaymentMonth,
  guarantorSuffix,
  joinNames,
  parseNum,
  totalFeesText,
  wordsText,
  type FieldDef,
  type FieldKey,
  type TermSheetData,
  type WordsKind,
} from "../utils/termSheet";

// The term sheet's text, defined once. The tab renders it with fill-in inputs; the PDF resolves it to plain text.
export type Part =
  | string
  | { f: FieldKey; as?: "words" }
  | { w: FieldKey; kind: WordsKind; cap?: boolean; style?: "legal" | "plain" }
  | { c: "guarantorsRow" | "guarantorText" | "totalFees" | "firstPaymentMonth" | "letterDate" };

export type Block =
  | { type: "letterhead" }
  | { type: "lines"; lines: Part[][]; align?: "center" }
  | { type: "p"; parts: Part[]; lead?: string; bold?: boolean }
  | { type: "row"; label: string; parts: Part[]; optional?: "extension" | "holdback" }
  | { type: "list"; style: "decimal" | "alpha" | "bullet"; items: Part[][] }
  | { type: "signatures" };

const f = (key: FieldKey, as?: "words"): Part => ({ f: key, as });
const words = (key: FieldKey, kind: WordsKind, opts?: { cap?: boolean; style?: "legal" | "plain" }): Part => ({
  w: key,
  kind,
  ...opts,
});
const c = (name: Extract<Part, { c: string }>["c"]): Part => ({ c: name });

export const TERM_SHEET_TEMPLATE: Block[] = [
  { type: "letterhead" },
  { type: "lines", align: "center", lines: [[f("date")]] },
  { type: "lines", lines: [[f("addresseeName")], [f("borrower")], [f("addressLine1")], [f("addressLine2")]] },
  {
    type: "p",
    lead: "RE:",
    parts: ["Proposed terms for loan secured by first deed of trust on the Property located at ", f("propertyAddress"), " (", f("propertyName"), ")"],
  },
  { type: "p", parts: ["Dear ", f("salutationName"), ","] },
  {
    type: "p",
    parts: [
      "Based on our review of the information provided to date, upon and subject to the terms and conditions set forth in this letter (the “Term Sheet”), 1Oak Capital has approved making a loan (the “Proposed Loan”) to the borrower identified below. This Proposed Term Sheet supersedes and replaces all prior proposed term sheets between the parties herein.",
    ],
  },

  { type: "row", label: "Borrower:", parts: [f("borrower"), ", ", f("borrowerEntity")] },
  { type: "row", label: "Guarantors:", parts: [c("guarantorsRow")] },
  { type: "row", label: "Lender:", parts: ["1Oak Capital LLC and/or an affiliate thereof"] },
  {
    type: "row",
    label: "Property:",
    parts: [f("propertyAddress"), " (the “Property”), commonly known as ", f("propertyName"), ", containing ", f("propertyDescription")],
  },
  {
    type: "row",
    label: "Proposed Loan Amount:",
    parts: [
      "Up to ",
      words("loanAmount", "dollars", { style: "legal" }),
      " (",
      f("loanAmount"),
      ") (the “Loan Amount”), allocated approximately as follows: ",
      f("allocation"),
    ],
  },
  { type: "row", label: "Use of Proceeds of Loan:", parts: [f("useOfProceeds")] },
  {
    type: "row",
    label: "Term:",
    parts: [words("termMonths", "count", { cap: true }), " (", f("termMonths"), ") months from the date of closing (the “Closing”)."],
  },
  {
    type: "row",
    label: "Extension:",
    optional: "extension",
    parts: [
      words("extCount", "count", { cap: true }),
      " (",
      f("extCount"),
      ") ",
      f("extMonths", "words"),
      "-month extension option upon payment of an extension fee equal to ",
      words("extFeePct", "pct"),
      " (",
      f("extFeePct"),
      ") of the then-outstanding Loan Amount. The extension option is subject to Lender’s approval and the following conditions: (a) no Event of Default then existing; (b) timely payment of the extension fee; and (c) at Lender’s option, delivery of an updated appraisal or evidence of material progress toward stabilization of the Property.",
    ],
  },
  {
    type: "row",
    label: "Rate:",
    parts: ["Fixed rate of ", words("ratePct", "pct"), " (", f("ratePct"), ") per annum, calculated on a ", f("dayCount"), " methodology."],
  },
  {
    type: "row",
    label: "Payments:",
    parts: [
      "The Loan shall be interest-only. Accrued interest shall be due and payable monthly in arrears. The first interest payment shall be due on the first day of the second calendar month following the Closing date (for example, if Closing occurs in ",
      f("exampleMonth"),
      ", the first interest payment shall be due ",
      c("firstPaymentMonth"),
      " 1). Thereafter, interest payments shall be due on the first day of each calendar month. All outstanding principal, together with all accrued and unpaid interest and any other amounts outstanding, shall be due and payable in full on the Maturity Date.",
    ],
  },
  {
    type: "row",
    label: "Prepayment:",
    parts: [
      "The Proposed Loan may be prepaid at any time; provided, however, that Lender shall receive a minimum of ",
      words("minInterestMonths", "count"),
      " (",
      f("minInterestMonths"),
      ") months of interest on the Loan Amount.",
    ],
  },
  {
    type: "row",
    label: "Fees:",
    parts: [
      c("totalFees"),
      " of the Loan Amount in the aggregate, payable as follows: (i) ",
      words("originationPct", "pct"),
      " (",
      f("originationPct"),
      ") due and payable to Lender at Closing (the “Origination Fee”); and (ii) ",
      words("exitPct", "pct"),
      " (",
      f("exitPct"),
      ") due and payable to Lender upon repayment or maturity of the Loan (the “Exit Fee”).",
    ],
  },
  {
    type: "row",
    label: "Security:",
    parts: [
      "The Loan shall be secured by: (i) a first-priority Deed of Trust and Security Agreement on the Property; (ii) a collateral assignment of the ",
      f("noteHolderShort"),
      " Loan Documents (including the Note, Deed of Trust, Assignment of Rents, and all related instruments); (iii) an absolute assignment of leases and rents; (iv) UCC-1 financing statements covering all personal property, equipment, fixtures, and general intangibles; (v) a pledge of ",
      words("pledgePct", "pct"),
      " (",
      f("pledgePct"),
      ") of the membership interests in Borrower; and (vi) the full-recourse Guaranties of ",
      c("guarantorText"),
      ".",
    ],
  },
  {
    type: "row",
    label: "Construction Holdback:",
    optional: "holdback",
    parts: [
      "The ",
      f("holdbackAmount"),
      " construction/rehabilitation component shall be held in an account controlled by Lender. Disbursements shall be made only for work actually performed and inspected by Lender or its agent, upon submission of appropriate invoices, lien waivers, and other documentation reasonably required by Lender. All work shall be performed on a lien-free basis.",
    ],
  },
  {
    type: "row",
    label: "Non-Refundable Advance:",
    parts: [
      "Borrower has deposited or shall deposit ",
      words("advanceAmount", "dollars", { style: "plain" }),
      " (",
      f("advanceAmount"),
      ") (the “Non-Refundable Advance”) with 1Oak Capital. The Non-Refundable Advance shall be used to pay actual costs of obtaining an appraisal, credit or title reports, surveys, and professional fees (collectively, the “Processing Costs”). The fee shall be refunded to the extent Lender has not incurred any of the above costs and elects not to proceed with the Loan.",
    ],
  },
  {
    type: "row",
    label: "Legal Fees:",
    parts: ["Borrower shall pay all legal fees and expenses of Lender’s counsel in connection with this transaction, whether or not the Loan closes."],
  },
  {
    type: "row",
    label: "Title Insurance:",
    parts: [
      "A title insurance commitment and final owner’s and lender’s policies in an amount equal to not less than the Loan Amount, showing Lender’s Deed of Trust as a valid first lien on the Property, subject only to exceptions acceptable to Lender in its sole discretion, and containing all endorsements required by Lender (including, without limitation, ",
      f("titleEndorsements"),
      ", and such other endorsements as Lender may require). Title shall be vested in Borrower free and clear of the claims of ",
      f("priorOwners"),
      ", and any junior liens (including the lien of ",
      f("juniorLienholder"),
      ") following foreclosure or deed-in-lieu. All curative documents contemplated by the Cooperation Agreement (including any ratification affidavits) shall be executed and recorded as required. The Title Company shall be chosen by Lender and all related fees paid by Borrower.",
    ],
  },
  {
    type: "row",
    label: "Appraisal:",
    parts: ["Lender shall order an appraisal. The Loan Amount shall not exceed ", f("maxLtvPct"), " of the as-is appraised value."],
  },
  {
    type: "row",
    label: "Loan Documents:",
    parts: [
      "All agreements, certificates, and documents executed in connection with the Proposed Loan (the “Loan Documents”) shall be prepared by counsel designated by Lender and shall contain such terms and provisions as required by Lender in its sole discretion, including without limitation: (i) Loan Agreement; (ii) Promissory Note; (iii) Deed of Trust and Security Agreement; (iv) Assignment of Leases and Rents; (v) Collateral Assignment of the ",
      f("noteHolderShort"),
      " Loan Documents; (vi) UCC-1 Financing Statements; (vii) Pledge of Membership Interests; (viii) Guaranties; and (ix) such other documents as Lender may require.",
    ],
  },
  {
    type: "row",
    label: "Governing Law; Jurisdiction and Waiver of Jury Trial:",
    parts: [
      "This Term Sheet and all rights and obligations of the parties hereunder shall be governed by and construed in accordance with the laws of the State of ",
      f("govState"),
      ", without regard to conflicts of law principles. The parties submit to the exclusive jurisdiction of the state and federal courts located in ",
      f("venueCounty"),
      " County, ",
      f("govState"),
      ", and waive any right to trial by jury.",
    ],
  },

  { type: "p", bold: true, parts: ["Conditions Precedent to Closing:"] },
  {
    type: "p",
    parts: [
      "Borrower shall be responsible for payment of all closing costs, including Lender’s title insurance policy, Lender’s attorney’s fees, recording fees, survey fees, appraisal fees, credit reports, and all other expenses incurred by Lender in connection with this Term Sheet and the Closing.",
    ],
  },
  { type: "p", parts: ["In addition to standard conditions, the following shall be conditions precedent to Closing:"] },
  {
    type: "list",
    style: "decimal",
    items: [
      [
        "The Cooperation Agreement dated on or about ",
        f("coopDate"),
        " among ",
        f("borrower"),
        ", ",
        f("coopOtherParties"),
        " shall remain in full force and effect, with no material default by any party thereunder.",
      ],
      [
        "Simultaneous or back-to-back Closing of (a) the Loan, (b) the purchase and assignment of the ",
        f("noteHolderShort"),
        " Loan Documents to Borrower, and (c) all documents necessary to effect the transfer of title to Borrower via foreclosure or deed-in-lieu.",
      ],
      ["Delivery of an updated payoff quote from ", f("noteHolder"), ", good through the Closing date."],
      [
        "Evidence that the automatic stay in Bankruptcy Case No. ",
        f("bankruptcyCaseNo"),
        " has been lifted, or entry of a final, non-appealable Stay Lift Order permitting enforcement of the ",
        f("noteHolderShort"),
        " Loan Documents.",
      ],
      [
        "Title to the Property shall be vested in Borrower free and clear of the claims of ",
        f("priorOwners"),
        ", and the junior lien of ",
        f("juniorLienholder"),
        " (or any successor), pursuant to foreclosure under the Deed of Trust or a deed-in-lieu of foreclosure.",
      ],
      [
        "Satisfactory review of the current title commitment (including ",
        f("titleCommitmentRef"),
        " or any update) and execution/recording of all curative documents required thereby.",
      ],
      [
        "Borrower shall maintain, and cause to be maintained, hazard, liability, rent-loss, and (if applicable) flood insurance in amounts and with companies acceptable to Lender, with Lender named as mortgagee and loss payee.",
      ],
      ["Lender shall have the right to approve the property manager for the Property."],
      ["Neither Borrower nor either Guarantor shall have filed, or consented to the filing of, any bankruptcy or insolvency proceeding."],
      [
        "All representations and warranties in the Loan Documents shall be true and correct, and all other conditions customary for a transaction of this type shall have been satisfied.",
      ],
    ],
  },

  { type: "p", parts: ["Prior to Closing, Borrower must submit the following:"] },
  {
    type: "list",
    style: "alpha",
    items: [
      ["Two forms of government-issued identification for each Guarantor"],
      ["Completed loan application"],
      ["Personal Financial Statements of each Guarantor"],
      ["Last three (3) months’ bank statements of Borrower and each Guarantor"],
      ["Current rent roll for the Property"],
      ["Year-to-date operating statement for the Property"],
      ["Fully executed Cooperation Agreement (and any amendments or extensions)"],
      ["Evidence of the status of the ", f("noteHolderShort"), " note purchase and any Stay Lift Order"],
      ["Such other due diligence items as Lender may reasonably request"],
    ],
  },

  { type: "p", bold: true, parts: ["Ongoing Covenants (among others):"] },
  {
    type: "list",
    style: "bullet",
    items: [
      [
        "Borrower shall deliver monthly rent rolls and operating statements within ",
        words("reportDays", "count"),
        " (",
        f("reportDays"),
        ") days after the end of each calendar month.",
      ],
      ["Lender shall have the right to inspect the Property at any time upon reasonable notice."],
      ["A default under the Cooperation Agreement shall constitute an Event of Default under the Loan."],
      ["Neither Borrower nor either Guarantor shall file or consent to any bankruptcy or insolvency proceeding during the term of the Loan."],
      ["Borrower shall not remove or replace the property manager without Lender’s prior written approval."],
    ],
  },

  {
    type: "row",
    label: "Miscellaneous:",
    parts: [
      "The loan referenced herein is subject to Lender’s final approval and may be terminated at any time in the sole discretion of Lender for any reason whatsoever. This Term Sheet should not be considered a commitment and is non-binding. The above terms are preliminary and may be subject to change based upon further review, additional financial or other information, credit information yet to be obtained, and Lender’s final underwriting. This Term Sheet sets forth the entire agreement and understanding of the parties relating to the subject matter hereof and supersedes all prior agreements, arrangements, and understandings, written or oral, relating to the subject matter hereof. No waiver, amendment, or extension of this Term Sheet shall be effective unless in writing and signed by each party to be bound thereby. This Term Sheet may be executed in multiple counterparts, each of which will be deemed an original, but all of which taken together will constitute one and the same instrument. The transmission of a signed counterpart electronically or by facsimile shall be treated as delivery of the original thereof.",
    ],
  },
  {
    type: "p",
    parts: [
      "We look forward to working with you on this transaction. Should these terms and conditions be satisfactory, please sign below and return to Lender on or before ",
      f("responseDate"),
      ".",
    ],
  },
  { type: "signatures" },
];

// ---- plain-text resolution (used by the PDF) -------------------------------------------------------

const blank = (label: string) => `[${label}]`;

export function fieldText(key: FieldKey, values: Record<string, string>, as?: "words"): string {
  const def: FieldDef = FIELDS[key];
  const raw = (values[key] ?? "").trim();
  // "#" and "%" say nothing on paper, so blank numbers print their label instead.
  if (!raw) return blank(def.kind === "int" || def.kind === "pct" ? def.label : def.placeholder);
  const n = parseNum(raw);
  if (def.kind === "money" && n !== null) return formatMoney(n, def.wholeDollars);
  if (def.kind === "pct" && n !== null) return formatPct(n);
  if (def.kind === "date") return formatLongDate(raw) || blank(def.placeholder);
  if (as === "words" && n !== null) return countWord(n, false);
  return raw;
}

export function guarantorNamesText(data: TermSheetData): string {
  return joinNames(data.guarantors) || blank("Guarantor name(s)");
}

export function partText(part: Part, data: TermSheetData): string {
  if (typeof part === "string") return part;
  if ("f" in part) return fieldText(part.f, data.values, part.as);
  if ("w" in part) {
    const text = wordsText(part.kind, parseNum(data.values[part.w]), part.cap ?? false, part.style ?? "legal");
    return text ?? blank(part.kind === "dollars" ? "amount in words" : part.kind === "pct" ? "percent in words" : "number in words");
  }
  switch (part.c) {
    case "guarantorsRow":
      return `${guarantorNamesText(data)}${guarantorSuffix(data.guarantors)}`;
    case "guarantorText":
      return guarantorNamesText(data);
    case "totalFees":
      return totalFeesText(data.values) ?? blank("total fee");
    case "firstPaymentMonth":
      return firstPaymentMonth(data.values) ?? blank("month");
    case "letterDate":
      return formatLongDate(data.values.date ?? "") || blank("date");
  }
}

export const partsText = (parts: Part[], data: TermSheetData) => parts.map((p) => partText(p, data)).join("");
