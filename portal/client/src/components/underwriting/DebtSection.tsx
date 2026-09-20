import { DAY_COUNTS, uid, type Underwriting, type UwResult } from "../../utils/underwriting";
import { money, mult, pct } from "../../utils/underwritingFormat";
import { Card, NumField, SelectField, SmallButton, TextField, Tile, td, tdR, th, thR } from "./fields";

interface Props {
  uw: Underwriting;
  calc: UwResult;
  update: (fn: (u: Underwriting) => Underwriting) => void;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-oak-sagelight">{label}</div>
      <div className="rounded-md border border-oak-line bg-white">{children}</div>
      {hint && <div className="mt-0.5 text-[11px] text-oak-sagelight">{hint}</div>}
    </div>
  );
}

function Row({ label, value, bold, warn }: { label: string; value: string; bold?: boolean; warn?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between border-t border-oak-line/60 py-1.5 text-[13px] ${bold ? "font-semibold" : ""}`}>
      <span className="text-oak-ink">{label}</span>
      <span className={`tabular-nums ${warn ? "text-red-700" : "text-oak-ink"}`}>{value}</span>
    </div>
  );
}

export function LoanTermsCard({ uw, calc, update, requestedLoan }: Props & { requestedLoan: number }) {
  const set = <K extends keyof Underwriting>(key: K, value: Underwriting[K]) => update((u) => ({ ...u, [key]: value }));
  const variance = calc.loan - requestedLoan;

  return (
    <Card title="Loan Sizing & Terms">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          <Field label="Target LTV (through our position)">
            <NumField ariaLabel="LTV" suffix="%" decimals={2} value={uw.ltv} onChange={(v) => set("ltv", v)} />
          </Field>
          <Field label="Senior debt ahead of us" hint="Leave $0 for a first-lien bridge loan">
            <NumField ariaLabel="Senior debt" prefix="$" value={uw.seniorDebt} onChange={(v) => set("seniorDebt", v)} />
          </Field>
          <Field label="Interest rate">
            <NumField ariaLabel="Interest rate" suffix="%" decimals={3} value={uw.rate} onChange={(v) => set("rate", v)} />
          </Field>
          <Field label="Senior interest rate" hint="Used for combined coverage">
            <NumField ariaLabel="Senior rate" suffix="%" decimals={3} value={uw.seniorRate} onChange={(v) => set("seniorRate", v)} />
          </Field>
          <Field label="Term (months)">
            <NumField ariaLabel="Term in months" value={uw.termMonths} onChange={(v) => set("termMonths", Math.max(0, Math.min(120, Math.round(v))))} />
          </Field>
          <Field label="Day count">
            <SelectField ariaLabel="Day count" value={uw.dayCount} options={DAY_COUNTS} onChange={(v) => set("dayCount", v as Underwriting["dayCount"])} />
          </Field>
          <Field label="Payment structure">
            <label className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-oak-ink">
              <input type="checkbox" checked={uw.interestOnly} onChange={(e) => set("interestOnly", e.target.checked)} />
              Interest-only
            </label>
          </Field>
          <Field label="Amortization (years)" hint={uw.interestOnly ? "Not used while interest-only" : "Balloon due at maturity"}>
            <NumField ariaLabel="Amortization years" disabled={uw.interestOnly} value={uw.amortYears} onChange={(v) => set("amortYears", v)} />
          </Field>
          <Field label="Origination fee">
            <NumField ariaLabel="Origination fee" suffix="%" decimals={2} value={uw.originationPct} onChange={(v) => set("originationPct", v)} />
          </Field>
          <Field label="Exit fee">
            <NumField ariaLabel="Exit fee" suffix="%" decimals={2} value={uw.exitPct} onChange={(v) => set("exitPct", v)} />
          </Field>
        </div>

        <div>
          <div className="rounded-lg bg-oak-dark px-4 py-3 text-oak-cream">
            <div className="text-[11px] uppercase tracking-wide text-oak-gold">Derived loan amount</div>
            <div className="font-condensed text-3xl font-semibold tabular-nums">{money(calc.loan)}</div>
            <div className="text-[12px] text-oak-cream/70">
              {uw.ltv}% LTV × {money(calc.value)} value{uw.seniorDebt > 0 ? ` − ${money(uw.seniorDebt)} senior` : ""}
            </div>
          </div>
          <div className="mt-2">
            <Row label="Requested loan (deal record)" value={money(requestedLoan)} />
            <Row
              label="Derived vs. requested"
              value={requestedLoan > 0 ? `${variance >= 0 ? "+" : ""}${money(variance)}` : "—"}
              warn={requestedLoan > 0 && variance < 0}
            />
            <Row label="Attachment LTV (senior ÷ value)" value={pct(calc.attachLtv, 1)} />
            <Row label="Detachment LTV (through our loan)" value={pct(calc.detachLtv, 1)} bold />
            <Row label="LTV to stabilized value" value={pct(calc.stabilizedLtv, 1)} />
            <Row label="Loan per SF" value={calc.loanPsf > 0 ? money(calc.loanPsf, 0) : "—"} />
            <Row label="Debt yield — current NOI" value={pct(calc.debtYieldCurrent, 2)} />
            <Row label="Debt yield — pro forma NOI" value={pct(calc.debtYieldProforma, 2)} />
            <Row label="Year-1 debt service (our loan)" value={money(calc.firstYearDebtService)} />
            <Row label="DSCR — current NOI (incl. senior)" value={mult(calc.dscrCurrent)} warn={calc.dscrCurrent != null && calc.dscrCurrent < 1} />
            <Row label="DSCR — pro forma NOI (incl. senior)" value={mult(calc.dscrProforma)} warn={calc.dscrProforma != null && calc.dscrProforma < 1} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function YieldCard({ uw, calc }: Props) {
  const hasLoan = calc.loan > 0 && calc.schedule.length > 0;

  return (
    <Card title="Debt & Investment Yield Projection">
      {!hasLoan ? (
        <p className="text-[13px] text-oak-sagelight">
          Enter a value basis, LTV, and term to project the loan and lender yield.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <Tile label="Lender yield (IRR)" value={pct(calc.yieldEffective, 2)} sub="Effective annual" />
            <Tile label="Nominal yield" value={pct(calc.yieldNominal, 2)} sub="Monthly IRR × 12" />
            <Tile label="Multiple on capital" value={mult(calc.moic, 3)} sub="Inflows ÷ net funding" />
            <Tile label="Total interest" value={money(calc.totalInterest)} sub={`${uw.termMonths} months`} />
            <Tile label="Fees earned" value={money(calc.origFee + calc.exitFee)} sub={`Orig ${money(calc.origFee)} · Exit ${money(calc.exitFee)}`} />
            <Tile label="Total profit" value={money(calc.totalProfit)} sub={`Net funding ${money(calc.netFunding)}`} />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  <th className={th}>Year</th>
                  <th className={thR}>Interest</th>
                  <th className={thR}>Principal</th>
                  <th className={thR}>Debt service</th>
                  <th className={thR}>Ending balance</th>
                  <th className={thR}>DSCR (current)</th>
                  <th className={thR}>DSCR (pro forma)</th>
                </tr>
              </thead>
              <tbody>
                {calc.years.map((y) => (
                  <tr key={y.year} className="border-t border-oak-line/60">
                    <td className={td}>Year {y.year}</td>
                    <td className={tdR}>{money(y.interest)}</td>
                    <td className={tdR}>{money(y.principal)}</td>
                    <td className={tdR}>{money(y.debtService)}</td>
                    <td className={tdR}>{money(y.endBal)}</td>
                    <td className={tdR}>{mult(y.dscrCurrent)}</td>
                    <td className={tdR}>{mult(y.dscrProforma)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-oak-line font-semibold">
                  <td className={td}>Maturity payoff</td>
                  <td colSpan={3} className={`${tdR} font-normal text-oak-sagelight`}>
                    Balloon {money(calc.balloon)} + exit fee {money(calc.exitFee)}
                  </td>
                  <td className={tdR}>{money(calc.balloon + calc.exitFee)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-oak-sagelight">
            {uw.interestOnly ? "Interest-only for the full term." : `Amortizing on a ${uw.amortYears}-year schedule with a balloon at maturity.`}{" "}
            Interest accrues monthly on {uw.dayCount}. Lender yield nets the origination fee against the initial
            funding and adds the exit fee to the payoff. Coverage ratios include the senior loan's interest.
          </p>

          <details className="mt-3">
            <summary className="cursor-pointer text-[12px] font-semibold text-oak-sage hover:text-oak-ink">
              Monthly schedule ({calc.schedule.length} payments)
            </summary>
            <div className="mt-2 max-h-72 overflow-auto rounded border border-oak-line">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className={th}>Month</th>
                    <th className={thR}>Beginning balance</th>
                    <th className={thR}>Interest</th>
                    <th className={thR}>Principal</th>
                    <th className={thR}>Payment</th>
                    <th className={thR}>Ending balance</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.schedule.map((r) => (
                    <tr key={r.month} className="border-t border-oak-line/60">
                      <td className={td}>{r.month}</td>
                      <td className={tdR}>{money(r.beginBal)}</td>
                      <td className={tdR}>{money(r.interest)}</td>
                      <td className={tdR}>{money(r.principal)}</td>
                      <td className={tdR}>{money(r.payment)}</td>
                      <td className={tdR}>{money(r.endBal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </Card>
  );
}

export function UseOfProceedsCard({ uw, calc, update }: Props) {
  const loan = calc.loan;
  const share = (n: number) => (loan > 0 ? pct(n / loan, 1) : "—");
  const over = calc.usesBalance < -0.5;

  return (
    <Card
      title="Use of Proceeds"
      right={
        <SmallButton onClick={() => update((u) => ({ ...u, uses: [...u.uses, { id: uid(), label: "", amount: 0 }] }))}>
          + Add use
        </SmallButton>
      }
    >
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Use</th>
            <th className={thR}>Amount</th>
            <th className={thR}>% of loan</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {uw.uses.map((row) => {
            const set = (patch: Partial<typeof row>) =>
              update((u) => ({ ...u, uses: u.uses.map((x) => (x.id === row.id ? { ...x, ...patch } : x)) }));
            return (
              <tr key={row.id} className="border-t border-oak-line/60">
                <td className={`${td} pl-0.5`}>
                  <TextField ariaLabel="Use of proceeds" value={row.label} placeholder="Description" onChange={(label) => set({ label })} />
                </td>
                <td className={td}>
                  <NumField ariaLabel="Amount" prefix="$" value={row.amount} onChange={(amount) => set({ amount })} />
                </td>
                <td className={tdR}>{share(row.amount)}</td>
                <td className="whitespace-nowrap text-right">
                  <SmallButton
                    title="Set this line to the unallocated balance"
                    onClick={() => set({ amount: Math.max(0, Math.round(row.amount + calc.usesBalance)) })}
                  >
                    Plug
                  </SmallButton>
                  <SmallButton danger title="Remove" onClick={() => update((u) => ({ ...u, uses: u.uses.filter((x) => x.id !== row.id) }))}>
                    ×
                  </SmallButton>
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-oak-line/60">
            <td className={td}>
              Origination fee <span className="text-[11px] text-oak-sagelight">({uw.originationPct}% of loan, auto)</span>
            </td>
            <td className={tdR}>{money(calc.origFee)}</td>
            <td className={tdR}>{share(calc.origFee)}</td>
            <td />
          </tr>
          <tr className="border-t border-oak-line/60">
            <td className={td}>
              <span className="flex items-center gap-2">
                Interest reserve
                <span className="flex w-28 items-center rounded border border-oak-line">
                  <NumField ariaLabel="Interest reserve months" suffix="mo" value={uw.interestReserveMonths} onChange={(v) => update((u) => ({ ...u, interestReserveMonths: Math.max(0, Math.round(v)) }))} />
                </span>
                <span className="text-[11px] text-oak-sagelight">auto from schedule</span>
              </span>
            </td>
            <td className={tdR}>{money(calc.interestReserve)}</td>
            <td className={tdR}>{share(calc.interestReserve)}</td>
            <td />
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-t border-oak-line font-semibold">
            <td className={td}>Total uses</td>
            <td className={tdR}>{money(calc.usesTotal)}</td>
            <td className={tdR}>{share(calc.usesTotal)}</td>
            <td />
          </tr>
          <tr className="font-semibold">
            <td className={td}>Loan amount (sources)</td>
            <td className={tdR}>{money(loan)}</td>
            <td className={tdR}>{loan > 0 ? "100.0%" : "—"}</td>
            <td />
          </tr>
          <tr className={`font-semibold ${over ? "bg-red-50 text-red-700" : "bg-oak-goldlight/40"}`}>
            <td className={td}>{over ? "Over-allocated" : "Unallocated balance"}</td>
            <td className={tdR}>{money(calc.usesBalance)}</td>
            <td className={tdR}>{share(calc.usesBalance)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 text-[11px] text-oak-sagelight">
        Uses are funded from the derived loan amount above. Origination fee and interest reserve calculate
        automatically from the loan terms; use "Plug" to drop any remaining balance onto a line.
      </p>
    </Card>
  );
}
