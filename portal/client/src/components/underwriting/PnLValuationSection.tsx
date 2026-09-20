import { Fragment } from "react";
import {
  BASIS_LABELS,
  EXPENSE_LINES,
  INCOME_LINES,
  type PnL,
  type PnLResult,
  type Underwriting,
  type UwResult,
  type ValueBasis,
} from "../../utils/underwriting";
import { money, pct } from "../../utils/underwritingFormat";
import { Card, NumField, td, tdR, th, thR } from "./fields";

interface Props {
  uw: Underwriting;
  calc: UwResult;
  update: (fn: (u: Underwriting) => Underwriting) => void;
}

type Col = "current" | "proforma";

export function PnLCard({ uw, calc, update }: Props) {
  const setPnl = (col: Col, key: keyof PnL, value: number) =>
    update((u) => ({ ...u, [col]: { ...u[col], [key]: value } }));

  const sf = calc.subjectSf;
  const psf = (n: number) => (sf > 0 ? money(n / sf, 2) : "—");

  function inputRow(key: keyof PnL, label: string) {
    const valueOf = (col: Col) => (key === "grossRent" ? calc.effectiveGrossRent[col] : uw[col][key]);
    return (
      <tr key={key} className="border-t border-oak-line/60">
        <td className={td}>{label}</td>
        {(["current", "proforma"] as Col[]).map((col) =>
          key === "grossRent" && calc.grossRentFromMix[col] ? (
            <Fragment key={col}>
              <td className={tdR} title="Calculated in Asset Type & Mix: rent per unit × units × 12">
                {money(valueOf(col))}
                <span className="ml-1.5 rounded bg-oak-goldlight/60 px-1 py-0.5 text-[10px] font-semibold uppercase text-oak-sage">
                  from mix
                </span>
              </td>
              <td className={`${tdR} text-oak-sagelight`}>{psf(valueOf(col))}</td>
            </Fragment>
          ) : (
            <Fragment key={col}>
              <td className={td}>
                <NumField ariaLabel={`${label} (${col})`} prefix="$" value={uw[col][key]} onChange={(v) => setPnl(col, key, v)} />
              </td>
              <td className={`${tdR} text-oak-sagelight`}>{psf(uw[col][key])}</td>
            </Fragment>
          )
        )}
        <td className={`${tdR} text-oak-sagelight`}>{money(valueOf("proforma") - valueOf("current"))}</td>
      </tr>
    );
  }

  function pctRow(key: "vacancyPct" | "mgmtFeePct", label: string) {
    return (
      <tr key={key} className="border-t border-oak-line/60">
        <td className={td}>{label}</td>
        {(["current", "proforma"] as Col[]).map((col) => (
          <Fragment key={col}>
            <td className={td}>
              <NumField ariaLabel={`${label} (${col})`} suffix="%" decimals={2} value={uw[col][key]} onChange={(v) => setPnl(col, key, v)} />
            </td>
            <td />
          </Fragment>
        ))}
        <td />
      </tr>
    );
  }

  function calcRow(label: string, pick: (r: PnLResult) => number, opts?: { bold?: boolean; negative?: boolean; shade?: boolean }) {
    const sign = opts?.negative ? -1 : 1;
    const cls = `${opts?.bold ? "font-semibold" : ""} ${opts?.shade ? "bg-oak-goldlight/40" : ""}`;
    return (
      <tr className={`border-t border-oak-line/60 ${cls}`}>
        <td className={td}>{label}</td>
        <td className={tdR}>{money(sign * pick(calc.current))}</td>
        <td className={`${tdR} font-normal text-oak-sagelight`}>{psf(pick(calc.current))}</td>
        <td className={tdR}>{money(sign * pick(calc.proforma))}</td>
        <td className={`${tdR} font-normal text-oak-sagelight`}>{psf(pick(calc.proforma))}</td>
        <td className={`${tdR} font-normal text-oak-sagelight`}>{money(sign * (pick(calc.proforma) - pick(calc.current)))}</td>
      </tr>
    );
  }

  const sectionRow = (label: string) => (
    <tr>
      <td colSpan={6} className="bg-black/[0.03] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-oak-sage">
        {label}
      </td>
    </tr>
  );

  return (
    <Card title="Profit & Loss — Current vs. Pro Forma (annual)">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr>
              <th className={th} />
              <th className={thR}>Current / in-place</th>
              <th className={thR}>$/SF</th>
              <th className={thR}>Pro forma</th>
              <th className={thR}>$/SF</th>
              <th className={thR}>Change</th>
            </tr>
          </thead>
          <tbody>
            {sectionRow("Income")}
            {INCOME_LINES.map((l) => inputRow(l.key, l.label))}
            {calcRow("Potential gross income", (r) => r.pgi, { bold: true })}
            {pctRow("vacancyPct", "Vacancy & credit loss (% of potential gross income)")}
            {calcRow("Less: vacancy & credit loss", (r) => r.vacancy, { negative: true })}
            {calcRow("Effective gross income (EGI)", (r) => r.egi, { bold: true })}

            {sectionRow("Operating expenses")}
            {EXPENSE_LINES.map((l) => inputRow(l.key, l.label))}
            {pctRow("mgmtFeePct", "Management fee (% of EGI)")}
            {calcRow("Management fee", (r) => r.mgmtFee)}
            {inputRow("reserves", "Replacement reserves")}
            {calcRow("Total operating expenses", (r) => r.totalOpex, { bold: true })}
            <tr className="border-t border-oak-line/60">
              <td className={td}>Expense ratio (% of EGI)</td>
              <td className={tdR}>{pct(calc.current.expenseRatio, 1)}</td>
              <td />
              <td className={tdR}>{pct(calc.proforma.expenseRatio, 1)}</td>
              <td />
              <td />
            </tr>
            {calcRow("Net operating income (NOI)", (r) => r.noi, { bold: true, shade: true })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function ValuationCard({ uw, calc, update }: Props) {
  const set = <K extends keyof Underwriting>(key: K, value: Underwriting[K]) => update((u) => ({ ...u, [key]: value }));
  const sf = calc.subjectSf;
  const psf = (v: number) => (sf > 0 && v > 0 ? money(v / sf, 0) : "—");

  const radio = (basis: ValueBasis) => (
    <input
      type="radio"
      name="valueBasis"
      aria-label={`Use ${BASIS_LABELS[basis]} for loan sizing`}
      checked={uw.valueBasis === basis}
      onChange={() => set("valueBasis", basis)}
    />
  );

  return (
    <Card title="Valuation — Cap Rate & Comparison Approaches">
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Loan basis</th>
            <th className={th}>Approach</th>
            <th className={thR}>NOI / basis</th>
            <th className={thR}>Cap rate</th>
            <th className={thR}>Value</th>
            <th className={thR}>$/SF</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-oak-line/60">
            <td className={td}>{radio("current")}</td>
            <td className={td}>Direct cap — current NOI (as-is)</td>
            <td className={tdR}>{money(calc.current.noi)}</td>
            <td className={td}>
              <NumField ariaLabel="Current cap rate" suffix="%" decimals={2} value={uw.capRateCurrent} onChange={(v) => set("capRateCurrent", v)} />
            </td>
            <td className={tdR}>{money(calc.valueCurrent)}</td>
            <td className={tdR}>{psf(calc.valueCurrent)}</td>
          </tr>
          <tr className="border-t border-oak-line/60">
            <td className={td}>{radio("proforma")}</td>
            <td className={td}>Direct cap — pro forma NOI (stabilized)</td>
            <td className={tdR}>{money(calc.proforma.noi)}</td>
            <td className={td}>
              <NumField ariaLabel="Pro forma cap rate" suffix="%" decimals={2} value={uw.capRateProforma} onChange={(v) => set("capRateProforma", v)} />
            </td>
            <td className={tdR}>{money(calc.valueProforma)}</td>
            <td className={tdR}>{psf(calc.valueProforma)}</td>
          </tr>
          <tr className="border-t border-oak-line/60">
            <td className={td}>{radio("salesComps")}</td>
            <td className={td}>Sales comparison (comp $/SF × mix)</td>
            <td className={tdR}>{sf > 0 ? `${sf.toLocaleString()} SF` : "—"}</td>
            <td className={tdR}>{calc.compWeightedCap != null ? `${calc.compWeightedCap.toFixed(2)}% (comps)` : "—"}</td>
            <td className={tdR}>{money(calc.salesCompValue)}</td>
            <td className={tdR}>{psf(calc.salesCompValue)}</td>
          </tr>
          <tr className="border-t border-oak-line/60">
            <td className={td}>{radio("manual")}</td>
            <td className={td}>Purchase price / manual value</td>
            <td />
            <td />
            <td className={td}>
              <NumField ariaLabel="Manual value" prefix="$" value={uw.manualValue} onChange={(v) => set("manualValue", v)} />
            </td>
            <td className={tdR}>{psf(uw.manualValue)}</td>
          </tr>
          <tr className="border-t border-oak-line bg-oak-goldlight/40 font-semibold">
            <td />
            <td className={td}>Concluded value — {calc.valueBasisLabel}</td>
            <td />
            <td />
            <td className={tdR}>{money(calc.value)}</td>
            <td className={tdR}>{psf(calc.value)}</td>
          </tr>
        </tbody>
      </table>
      {calc.value <= 0 && (
        <p className="mt-2 text-[12px] text-amber-700">
          The selected basis produces no value yet — enter NOI, comps, or a manual value to size the loan.
        </p>
      )}

      <div className="mt-5 text-[12px] font-semibold text-oak-ink">Cap rate sensitivity (against proposed debt)</div>
      <table className="mt-1 w-full">
        <thead>
          <tr>
            <th className={th}>Cap rate</th>
            <th className={thR}>Value @ current NOI</th>
            <th className={thR}>Combined LTV</th>
            <th className={thR}>Value @ pro forma NOI</th>
            <th className={thR}>Combined LTV</th>
          </tr>
        </thead>
        <tbody>
          {calc.sensitivity.map((s, i) => (
            <tr key={i} className={`border-t border-oak-line/60 ${i === 2 ? "bg-oak-goldlight/40 font-semibold" : ""}`}>
              <td className={td}>{s.cap.toFixed(2)}%</td>
              <td className={tdR}>{money(s.valueCurrent)}</td>
              <td className={tdR}>{pct(s.ltvCurrent, 1)}</td>
              <td className={tdR}>{money(s.valueProforma)}</td>
              <td className={tdR}>{pct(s.ltvProforma, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
