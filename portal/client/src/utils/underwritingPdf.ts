import type { CellDef, CellHookData, UserOptions } from "jspdf-autotable";
import type { Lead } from "../types";
import { safeFilename, saveBlob } from "./download";
import {
  EXPENSE_LINES,
  INCOME_LINES,
  rowAnnualRent,
  rowTotalSf,
  type PnL,
  type Underwriting,
  type UwResult,
} from "./underwriting";
import { money, mult, pct } from "./underwritingFormat";

export interface UnderwritingPdfInput {
  lead: Lead;
  uw: Underwriting;
  calc: UwResult;
  preparedBy: string;
}

type RGB = [number, number, number];
const DARK: RGB = [35, 44, 23];
const CREAM: RGB = [250, 250, 248];
const GOLD: RGB = [228, 195, 134];
const GOLD_LIGHT: RGB = [246, 238, 216];
const SAGE: RGB = [90, 99, 80];
const INK: RGB = [28, 34, 17];
const LINE: RGB = [228, 226, 218];
const RED: RGB = [185, 28, 28];

const BOLD = { fontStyle: "bold" as const };
const SHADE = { fontStyle: "bold" as const, fillColor: GOLD_LIGHT };
const SECTION = { fontStyle: "bold" as const, fillColor: [238, 237, 230] as RGB, textColor: SAGE, fontSize: 7 };

const styledRow = (cells: string[], styles: Record<string, unknown>): CellDef[] =>
  cells.map((content) => ({ content, styles }));

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${m}/${d}/${y}` : iso;
};

const psfOf = (n: number, sf: number) => (sf > 0 ? money(n / sf, 2) : "—");

export async function buildUnderwritingPdf({ lead, uw, calc, preparedBy }: UnderwritingPdfInput) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const TOP = 54;
  const BOTTOM = 42;
  let y = TOP;

  const ensureSpace = (needed: number) => {
    if (y + needed > H - BOTTOM) {
      doc.addPage();
      y = TOP;
    }
  };

  function heading(title: string, needed = 80) {
    ensureSpace(needed);
    if (y > TOP) y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    doc.text(title.toUpperCase(), M, y);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1.2);
    doc.line(M, y + 4, W - M, y + 4);
    y += 13;
  }

  function subheading(title: string, needed = 60) {
    ensureSpace(needed);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(title, M, y);
    y += 6;
  }

  function note(text: string) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...SAGE);
    const lines = doc.splitTextToSize(text, W - M * 2) as string[];
    ensureSpace(lines.length * 9 + 4);
    doc.text(lines, M, y + 3);
    y += lines.length * 9 + 8;
  }

  function table(opts: UserOptions & { right?: number[] }) {
    const { right = [], ...rest } = opts;
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, top: TOP, bottom: BOTTOM },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
        lineColor: LINE,
        lineWidth: 0.4,
        textColor: INK,
        overflow: "linebreak",
      },
      headStyles: { fillColor: DARK, textColor: CREAM, fontStyle: "bold", fontSize: 7.5 },
      footStyles: { fillColor: [255, 255, 255], textColor: INK, fontStyle: "bold" },
      didParseCell: (d: CellHookData) => {
        if (right.includes(d.column.index)) d.cell.styles.halign = "right";
      },
      ...rest,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  }

  // ---- Title block ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(lead.borrower_name, M, y + 8);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SAGE);
  const place = [lead.property_address, [lead.city, lead.state].filter(Boolean).join(", ")].filter(Boolean).join(" - ");
  doc.text([place, `${lead.asset_class} | ${lead.loan_type} | ${lead.stage}`].filter(Boolean).join("   |   "), M, y);
  y += 16;

  // ---- Key metrics ----
  const boxes: { label: string; value: string; sub: string; warn?: boolean }[] = [
    { label: "CONCLUDED VALUE", value: money(calc.value), sub: calc.valueBasisLabel },
    { label: "DERIVED LOAN", value: money(calc.loan), sub: `${uw.ltv}% LTV` },
    { label: "COMBINED LTV", value: pct(calc.detachLtv, 1), sub: `Stabilized ${pct(calc.stabilizedLtv, 1)}` },
    { label: "DEBT YIELD", value: pct(calc.debtYieldCurrent, 2), sub: `Pro forma ${pct(calc.debtYieldProforma, 2)}` },
    {
      label: "DSCR",
      value: mult(calc.dscrCurrent),
      sub: `Pro forma ${mult(calc.dscrProforma)}`,
      warn: calc.dscrCurrent != null && calc.dscrCurrent < 1,
    },
    { label: "LENDER YIELD (IRR)", value: pct(calc.yieldEffective, 2), sub: uw.interestOnly ? "Interest-only" : "Amortizing" },
  ];
  const gap = 8;
  const bw = (W - M * 2 - gap * (boxes.length - 1)) / boxes.length;
  boxes.forEach((b, i) => {
    const x = M + i * (bw + gap);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, bw, 46, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...SAGE);
    doc.text(b.label, x + 7, y + 12);
    doc.setFontSize(13);
    doc.setTextColor(...(b.warn ? RED : INK));
    doc.text(b.value, x + 7, y + 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...SAGE);
    doc.text(doc.splitTextToSize(b.sub, bw - 12) as string[], x + 7, y + 39);
  });
  y += 46 + 18;

  // ---- Asset type & mix ----
  heading("Asset Type & Mix");
  table({
    head: [["Asset type", "SF / unit", "Units", "Total SF", "% of SF", "Current rent / unit / mo", "Pro forma rent / unit / mo", "Current annual", "Pro forma annual", "Description"]],
    body: uw.mix.map((m) => [
      m.type,
      m.sf ? m.sf.toLocaleString() : "—",
      m.units.toLocaleString(),
      rowTotalSf(m) > 0 ? rowTotalSf(m).toLocaleString() : "—",
      calc.subjectSf > 0 ? pct(rowTotalSf(m) / calc.subjectSf, 1) : "—",
      m.currentRent ? money(m.currentRent) : "—",
      m.proformaRent ? money(m.proformaRent) : "—",
      rowAnnualRent(m, "current") > 0 ? money(rowAnnualRent(m, "current")) : "—",
      rowAnnualRent(m, "proforma") > 0 ? money(rowAnnualRent(m, "proforma")) : "—",
      m.description,
    ]),
    foot: [["Total", "", calc.subjectUnits.toLocaleString(), calc.subjectSf.toLocaleString(), calc.subjectSf > 0 ? "100.0%" : "—", "", "", money(calc.mixRent.current), money(calc.mixRent.proforma), ""]],
    showFoot: "lastPage",
    right: [1, 2, 3, 4, 5, 6, 7, 8],
    columnStyles: { 9: { cellWidth: 150 } },
  });

  // ---- Comparables ----
  heading("Comparables");
  if (uw.saleComps.length === 0 && uw.rentComps.length === 0) {
    note("No sale or rent comparables entered.");
  }
  if (uw.saleComps.length > 0) {
    subheading("Sale comparables");
    table({
      head: [["Used", "Address / property", "Type", "Sale date", "Sale price", "SF", "$/SF", "Cap rate"]],
      body: uw.saleComps.map((c) => [
        c.include ? "Yes" : "No",
        c.address,
        c.type,
        c.saleDate ? fmtDate(c.saleDate) : "—",
        money(c.price),
        c.sf ? c.sf.toLocaleString() : "—",
        c.sf > 0 && c.price > 0 ? money(c.price / c.sf, 0) : "—",
        c.capRate ? `${c.capRate.toFixed(2)}%` : "—",
      ]),
      right: [4, 5, 6, 7],
      columnStyles: { 1: { cellWidth: 200 } },
    });
  }
  if (uw.rentComps.length > 0) {
    subheading("Rent comparables");
    table({
      head: [["Used", "Address / property", "Type", "SF", "Rent $/SF/yr", "Lease type"]],
      body: uw.rentComps.map((c) => [
        c.include ? "Yes" : "No",
        c.address,
        c.type,
        c.sf ? c.sf.toLocaleString() : "—",
        c.rentPsf ? money(c.rentPsf, 2) : "—",
        c.leaseType,
      ]),
      right: [3, 4],
      columnStyles: { 1: { cellWidth: 220 } },
    });
  }
  if (uw.saleComps.length > 0 || uw.rentComps.length > 0) {
    subheading("Comp-implied metrics by asset component");
    table({
      head: [["Component", "SF", "Avg sale $/SF", "Avg cap", "Avg rent $/SF", "Implied value", "Implied rent"]],
      body: [
        ...calc.typeStats.map((t) => [
          t.type + (t.saleFallback || t.rentFallback ? " (all comps)" : ""),
          t.sf.toLocaleString(),
          t.salePsf != null ? money(t.salePsf, 0) : "—",
          t.saleCap != null ? `${t.saleCap.toFixed(2)}%` : "—",
          t.rentPsf != null ? money(t.rentPsf, 2) : "—",
          t.salePsf != null ? money(t.salePsf * t.sf) : "—",
          t.rentPsf != null ? money(t.rentPsf * t.sf) : "—",
        ]),
        styledRow(
          [
            "Blended",
            calc.subjectSf.toLocaleString(),
            calc.subjectSf > 0 && calc.salesCompValue > 0 ? money(calc.salesCompValue / calc.subjectSf, 0) : "—",
            calc.compWeightedCap != null ? `${calc.compWeightedCap.toFixed(2)}%` : "—",
            calc.subjectSf > 0 && calc.marketRent > 0 ? money(calc.marketRent / calc.subjectSf, 2) : "—",
            money(calc.salesCompValue),
            money(calc.marketRent),
          ],
          BOLD
        ),
      ],
      right: [1, 2, 3, 4, 5, 6],
    });
  }

  // ---- P&L ----
  heading("Profit & Loss - Current vs. Pro Forma (annual)", 120);
  const sf = calc.subjectSf;
  const valueOf = (col: "current" | "proforma", key: keyof PnL) =>
    key === "grossRent" ? calc.effectiveGrossRent[col] : uw[col][key];
  const inputRow = (key: keyof PnL, label: string) => {
    const c = valueOf("current", key);
    const p = valueOf("proforma", key);
    return [label, money(c), psfOf(c, sf), money(p), psfOf(p, sf), money(p - c)];
  };
  const calcRow = (label: string, pick: (r: UwResult["current"]) => number, opts?: { negative?: boolean; style?: Record<string, unknown> }) => {
    const sign = opts?.negative ? -1 : 1;
    const c = pick(calc.current);
    const p = pick(calc.proforma);
    const cells = [label, money(sign * c), psfOf(c, sf), money(sign * p), psfOf(p, sf), money(sign * (p - c))];
    return opts?.style ? styledRow(cells, opts.style) : cells;
  };
  const sectionRow = (label: string): CellDef[] => [{ content: label.toUpperCase(), colSpan: 6, styles: SECTION }];
  const pctRow = (label: string, key: "vacancyPct" | "mgmtFeePct") => [label, `${uw.current[key].toFixed(2)}%`, "", `${uw.proforma[key].toFixed(2)}%`, "", ""];

  table({
    head: [["", "Current / in-place", "$/SF", "Pro forma", "$/SF", "Change"]],
    body: [
      sectionRow("Income"),
      ...INCOME_LINES.map((l) =>
        inputRow(
          l.key,
          l.key === "grossRent" && (calc.grossRentFromMix.current || calc.grossRentFromMix.proforma)
            ? `${l.label} (from asset mix)`
            : l.label
        )
      ),
      calcRow("Potential gross income", (r) => r.pgi, { style: BOLD }),
      pctRow("Vacancy & credit loss (% of potential gross income)", "vacancyPct"),
      calcRow("Less: vacancy & credit loss", (r) => r.vacancy, { negative: true }),
      calcRow("Effective gross income (EGI)", (r) => r.egi, { style: BOLD }),
      sectionRow("Operating expenses"),
      ...EXPENSE_LINES.map((l) => inputRow(l.key, l.label)),
      pctRow("Management fee (% of EGI)", "mgmtFeePct"),
      calcRow("Management fee", (r) => r.mgmtFee),
      inputRow("reserves", "Replacement reserves"),
      calcRow("Total operating expenses", (r) => r.totalOpex, { style: BOLD }),
      ["Expense ratio (% of EGI)", pct(calc.current.expenseRatio, 1), "", pct(calc.proforma.expenseRatio, 1), "", ""],
      calcRow("Net operating income (NOI)", (r) => r.noi, { style: SHADE }),
    ],
    right: [1, 2, 3, 4, 5],
    columnStyles: { 0: { cellWidth: 260 } },
  });

  // ---- Valuation ----
  heading("Valuation - Cap Rate & Comparison Approaches", 150);
  const psf = (v: number) => (sf > 0 && v > 0 ? money(v / sf, 0) : "—");
  const sel = (basis: Underwriting["valueBasis"]) => (uw.valueBasis === basis ? "SELECTED" : "");
  table({
    head: [["Loan basis", "Approach", "NOI / basis", "Cap rate", "Value", "$/SF"]],
    body: [
      [sel("current"), "Direct cap - current NOI (as-is)", money(calc.current.noi), `${uw.capRateCurrent.toFixed(2)}%`, money(calc.valueCurrent), psf(calc.valueCurrent)],
      [sel("proforma"), "Direct cap - pro forma NOI (stabilized)", money(calc.proforma.noi), `${uw.capRateProforma.toFixed(2)}%`, money(calc.valueProforma), psf(calc.valueProforma)],
      [sel("salesComps"), "Sales comparison (comp $/SF x mix)", sf > 0 ? `${sf.toLocaleString()} SF` : "—", calc.compWeightedCap != null ? `${calc.compWeightedCap.toFixed(2)}% (comps)` : "—", money(calc.salesCompValue), psf(calc.salesCompValue)],
      [sel("manual"), "Purchase price / manual value", "", "", money(uw.manualValue), psf(uw.manualValue)],
      styledRow(["", `Concluded value - ${calc.valueBasisLabel}`, "", "", money(calc.value), psf(calc.value)], SHADE),
    ],
    right: [2, 3, 4, 5],
    columnStyles: { 0: { cellWidth: 70 } },
  });
  subheading("Cap rate sensitivity (against proposed debt)", 120);
  table({
    head: [["Cap rate", "Value @ current NOI", "Combined LTV", "Value @ pro forma NOI", "Combined LTV"]],
    body: calc.sensitivity.map((s, i) => {
      const cells = [`${s.cap.toFixed(2)}%`, money(s.valueCurrent), pct(s.ltvCurrent, 1), money(s.valueProforma), pct(s.ltvProforma, 1)];
      return i === 2 ? styledRow(cells, SHADE) : cells;
    }),
    right: [0, 1, 2, 3, 4],
  });

  // ---- Loan sizing & terms ----
  heading("Loan Sizing & Terms", 200);
  const variance = calc.loan - (lead.loan_amount ?? 0);
  const terms: [string, string][] = [
    ["Target LTV (through our position)", `${uw.ltv}%`],
    ["Senior debt ahead of us", money(uw.seniorDebt)],
    ["Senior interest rate", `${uw.seniorRate}%`],
    ["Interest rate", `${uw.rate}%`],
    ["Term", `${uw.termMonths} months`],
    ["Day count", uw.dayCount],
    ["Payment structure", uw.interestOnly ? "Interest-only" : `Amortizing (${uw.amortYears}-year schedule)`],
    ["Origination fee", `${uw.originationPct}%`],
    ["Exit fee", `${uw.exitPct}%`],
    ["Interest reserve", `${uw.interestReserveMonths} months`],
  ];
  const metrics: [string, string][] = [
    ["Derived loan amount", money(calc.loan)],
    ["Requested loan (deal record)", money(lead.loan_amount ?? 0)],
    ["Derived vs. requested", (lead.loan_amount ?? 0) > 0 ? `${variance >= 0 ? "+" : ""}${money(variance)}` : "—"],
    ["Attachment LTV (senior / value)", pct(calc.attachLtv, 1)],
    ["Detachment LTV (through our loan)", pct(calc.detachLtv, 1)],
    ["LTV to stabilized value", pct(calc.stabilizedLtv, 1)],
    ["Loan per SF", calc.loanPsf > 0 ? money(calc.loanPsf, 0) : "—"],
    ["Debt yield - current / pro forma NOI", `${pct(calc.debtYieldCurrent, 2)} / ${pct(calc.debtYieldProforma, 2)}`],
    ["Year-1 debt service (our loan)", money(calc.firstYearDebtService)],
    ["DSCR incl. senior - current / pro forma", `${mult(calc.dscrCurrent)} / ${mult(calc.dscrProforma)}`],
  ];
  table({
    body: terms.map((t, i) => [t[0], t[1], metrics[i][0], metrics[i][1]]),
    right: [1, 3],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 200 }, 1: { cellWidth: 150 }, 2: { fontStyle: "bold", cellWidth: 220 } },
  });

  // ---- Debt & yield ----
  heading("Debt & Investment Yield Projection", 170);
  if (calc.loan <= 0 || calc.schedule.length === 0) {
    note("No loan sized - enter a value basis, LTV and term to project the loan and lender yield.");
  } else {
    table({
      head: [["Lender yield (IRR)", "Nominal yield", "Multiple on capital", "Total interest", "Fees earned", "Total profit", "Net funding"]],
      body: [[pct(calc.yieldEffective, 2), pct(calc.yieldNominal, 2), mult(calc.moic, 3), money(calc.totalInterest), money(calc.origFee + calc.exitFee), money(calc.totalProfit), money(calc.netFunding)]],
      right: [0, 1, 2, 3, 4, 5, 6],
    });
    table({
      head: [["Year", "Interest", "Principal", "Debt service", "Ending balance", "DSCR (current)", "DSCR (pro forma)"]],
      body: [
        ...calc.years.map((r) => [`Year ${r.year}`, money(r.interest), money(r.principal), money(r.debtService), money(r.endBal), mult(r.dscrCurrent), mult(r.dscrProforma)]),
        styledRow(["Maturity payoff", "", "", "", money(calc.balloon + calc.exitFee), "", ""], BOLD),
      ],
      right: [1, 2, 3, 4, 5, 6],
    });
    note(
      `${uw.interestOnly ? "Interest-only for the full term." : `Amortizing on a ${uw.amortYears}-year schedule with a balloon at maturity.`} Interest accrues monthly on ${uw.dayCount}. ` +
        "Lender yield nets the origination fee against the initial funding and adds the exit fee to the payoff. Coverage ratios include the senior loan's interest."
    );
  }

  // ---- Use of proceeds ----
  heading("Use of Proceeds", 150);
  const share = (n: number) => (calc.loan > 0 ? pct(n / calc.loan, 1) : "—");
  const over = calc.usesBalance < -0.5;
  table({
    head: [["Use", "Amount", "% of loan"]],
    body: [
      ...uw.uses.map((u) => [u.label || "(unnamed)", money(u.amount), share(u.amount)]),
      [`Origination fee (${uw.originationPct}% of loan, auto)`, money(calc.origFee), share(calc.origFee)],
      [`Interest reserve (${uw.interestReserveMonths} months, auto)`, money(calc.interestReserve), share(calc.interestReserve)],
      styledRow(["Total uses", money(calc.usesTotal), share(calc.usesTotal)], BOLD),
      styledRow(["Loan amount (sources)", money(calc.loan), calc.loan > 0 ? "100.0%" : "—"], BOLD),
      styledRow(
        [over ? "Over-allocated" : "Unallocated balance", money(calc.usesBalance), share(calc.usesBalance)],
        over ? { ...BOLD, textColor: RED } : SHADE
      ),
    ],
    right: [1, 2],
    columnStyles: { 0: { cellWidth: 330 } },
  });

  // ---- Page headers / footers ----
  const generated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text("1OAK CAPITAL", M, 26);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SAGE);
    doc.text("Valuation & Underwriting", M + 66, 26);
    doc.text(lead.borrower_name, W - M, 26, { align: "right" });
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    doc.line(M, 32, W - M, 32);
    doc.line(M, H - 30, W - M, H - 30);
    doc.setFontSize(7);
    doc.text(`Confidential - for internal use only. Prepared by ${preparedBy} on ${generated}.`, M, H - 19);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 19, { align: "right" });
  }

  doc.setProperties({
    title: `Valuation & Underwriting - ${lead.borrower_name}`,
    subject: "1Oak Capital deal underwriting",
    author: preparedBy,
    creator: "1Oak Tracker",
  });
  return doc;
}

export async function downloadUnderwritingPdf(input: UnderwritingPdfInput) {
  const doc = await buildUnderwritingPdf(input);
  const date = new Date().toISOString().slice(0, 10);
  saveBlob(doc.output("blob"), `${safeFilename(`${input.lead.borrower_name} - Underwriting ${date}`)}.pdf`);
}
