import { ASSET_CLASSES } from "../../types";
import {
  LEASE_TYPES,
  newMixRow,
  rowAnnualRent,
  rowTotalSf,
  uid,
  type AssetMixRow,
  type Underwriting,
  type UwResult,
} from "../../utils/underwriting";
import { money, pct } from "../../utils/underwritingFormat";
import { Card, NumField, SelectField, SmallButton, TextField, td, tdR, th, thR } from "./fields";

interface Props {
  uw: Underwriting;
  calc: UwResult;
  update: (fn: (u: Underwriting) => Underwriting) => void;
}

export function AssetMixCard({ uw, calc, update }: Props) {
  const setRow = (id: string, patch: Partial<AssetMixRow>) =>
    update((u) => ({ ...u, mix: u.mix.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));

  return (
    <Card
      title="Asset Type & Mix"
      right={
        <SmallButton onClick={() => update((u) => ({ ...u, mix: [...u.mix, newMixRow(ASSET_CLASSES[0])] }))}>
          + Add component
        </SmallButton>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px]">
          <thead>
            <tr>
              <th className={th}>Asset type</th>
              <th className={thR}>SF / unit</th>
              <th className={thR}>Units</th>
              <th className={thR}>Total SF</th>
              <th className={thR}>% of SF</th>
              <th className={thR}>Current rent / unit / mo</th>
              <th className={thR}>Pro forma rent / unit / mo</th>
              <th className={thR}>Current annual</th>
              <th className={thR}>Pro forma annual</th>
              <th className={th}>Description</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {uw.mix.map((row) => {
              const totalSf = rowTotalSf(row);
              return (
                <tr key={row.id} className="border-t border-oak-line/60">
                  <td className={td}>
                    <SelectField ariaLabel="Asset type" className="min-w-[150px]" value={row.type} options={ASSET_CLASSES} onChange={(type) => setRow(row.id, { type })} />
                  </td>
                  <td className={td}>
                    <NumField ariaLabel="SF per unit" value={row.sf} onChange={(sf) => setRow(row.id, { sf })} />
                  </td>
                  <td className={td}>
                    <NumField ariaLabel="Units" value={row.units} onChange={(units) => setRow(row.id, { units })} />
                  </td>
                  <td className={tdR}>{totalSf > 0 ? totalSf.toLocaleString() : "—"}</td>
                  <td className={tdR}>{calc.subjectSf > 0 ? pct(totalSf / calc.subjectSf, 1) : "—"}</td>
                  <td className={td}>
                    <NumField ariaLabel="Current rent per unit per month" prefix="$" value={row.currentRent} onChange={(currentRent) => setRow(row.id, { currentRent })} />
                  </td>
                  <td className={td}>
                    <NumField ariaLabel="Pro forma rent per unit per month" prefix="$" value={row.proformaRent} onChange={(proformaRent) => setRow(row.id, { proformaRent })} />
                  </td>
                  <td className={tdR}>{rowAnnualRent(row, "current") > 0 ? money(rowAnnualRent(row, "current")) : "—"}</td>
                  <td className={tdR}>{rowAnnualRent(row, "proforma") > 0 ? money(rowAnnualRent(row, "proforma")) : "—"}</td>
                  <td className={td}>
                    <TextField ariaLabel="Description" className="min-w-[180px]" placeholder="e.g. 2BR/1BA garden units" value={row.description} onChange={(description) => setRow(row.id, { description })} />
                  </td>
                  <td className="w-8 text-right">
                    {uw.mix.length > 1 && (
                      <SmallButton danger title="Remove" onClick={() => update((u) => ({ ...u, mix: u.mix.filter((m) => m.id !== row.id) }))}>
                        ×
                      </SmallButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-oak-line font-semibold">
              <td className={td}>Total</td>
              <td />
              <td className={tdR}>{calc.subjectUnits.toLocaleString()}</td>
              <td className={tdR}>{calc.subjectSf.toLocaleString()}</td>
              <td className={tdR}>{calc.subjectSf > 0 ? "100.0%" : "—"}</td>
              <td />
              <td />
              <td className={tdR}>{money(calc.mixRent.current)}</td>
              <td className={tdR}>{money(calc.mixRent.proforma)}</td>
              <td />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-oak-sagelight">
        Total SF = SF per unit × units. Rent is monthly per unit; annual rent (rent × units × 12) feeds Base
        rental income in the P&amp;L below. Comps are matched to each component by asset type and weighted by
        total square footage, so a mixed-use property blends its retail, office, and multifamily comps automatically.
      </p>
    </Card>
  );
}

export function CompsCard({ uw, calc, update }: Props) {
  const defaultType = uw.mix[0]?.type ?? ASSET_CLASSES[0];
  const mixTypes = Array.from(new Set([...uw.mix.map((m) => m.type), ...ASSET_CLASSES]));

  return (
    <Card title="Comparables">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[12px] font-semibold text-oak-ink">Sale comparables</div>
        <SmallButton
          onClick={() =>
            update((u) => ({
              ...u,
              saleComps: [
                ...u.saleComps,
                { id: uid(), address: "", type: defaultType, saleDate: "", price: 0, sf: 0, capRate: 0, include: true },
              ],
            }))
          }
        >
          + Add sale comp
        </SmallButton>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr>
              <th className={th}>Use</th>
              <th className={th}>Address / property</th>
              <th className={th}>Type</th>
              <th className={th}>Sale date</th>
              <th className={thR}>Sale price</th>
              <th className={thR}>SF</th>
              <th className={thR}>$/SF</th>
              <th className={thR}>Cap rate</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {uw.saleComps.length === 0 && (
              <tr>
                <td colSpan={9} className="px-2 py-3 text-[12px] text-oak-sagelight">
                  No sale comps yet.
                </td>
              </tr>
            )}
            {uw.saleComps.map((c) => {
              const set = (patch: Partial<typeof c>) =>
                update((u) => ({ ...u, saleComps: u.saleComps.map((x) => (x.id === c.id ? { ...x, ...patch } : x)) }));
              return (
                <tr key={c.id} className={`border-t border-oak-line/60 ${c.include ? "" : "opacity-50"}`}>
                  <td className={td}>
                    <input
                      type="checkbox"
                      aria-label="Include comp"
                      checked={c.include}
                      onChange={(e) => set({ include: e.target.checked })}
                    />
                  </td>
                  <td className={td}>
                    <TextField ariaLabel="Address" value={c.address} onChange={(address) => set({ address })} />
                  </td>
                  <td className={td}>
                    <SelectField ariaLabel="Type" value={c.type} options={mixTypes} onChange={(type) => set({ type })} />
                  </td>
                  <td className={td}>
                    <TextField ariaLabel="Sale date" type="date" value={c.saleDate} onChange={(saleDate) => set({ saleDate })} />
                  </td>
                  <td className={td}>
                    <NumField ariaLabel="Sale price" prefix="$" value={c.price} onChange={(price) => set({ price })} />
                  </td>
                  <td className={td}>
                    <NumField ariaLabel="Comp SF" value={c.sf} onChange={(sf) => set({ sf })} />
                  </td>
                  <td className={tdR}>{c.sf > 0 && c.price > 0 ? money(c.price / c.sf, 0) : "—"}</td>
                  <td className={td}>
                    <NumField ariaLabel="Cap rate" suffix="%" decimals={2} value={c.capRate} onChange={(capRate) => set({ capRate })} />
                  </td>
                  <td className="w-8 text-right">
                    <SmallButton danger title="Remove" onClick={() => update((u) => ({ ...u, saleComps: u.saleComps.filter((x) => x.id !== c.id) }))}>
                      ×
                    </SmallButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mb-2 mt-5 flex items-center justify-between">
        <div className="text-[12px] font-semibold text-oak-ink">Rent comparables</div>
        <SmallButton
          onClick={() =>
            update((u) => ({
              ...u,
              rentComps: [
                ...u.rentComps,
                { id: uid(), address: "", type: defaultType, sf: 0, rentPsf: 0, leaseType: LEASE_TYPES[0], include: true },
              ],
            }))
          }
        >
          + Add rent comp
        </SmallButton>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr>
              <th className={th}>Use</th>
              <th className={th}>Address / property</th>
              <th className={th}>Type</th>
              <th className={thR}>SF</th>
              <th className={thR}>Rent $/SF/yr</th>
              <th className={th}>Lease type</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {uw.rentComps.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-3 text-[12px] text-oak-sagelight">
                  No rent comps yet.
                </td>
              </tr>
            )}
            {uw.rentComps.map((c) => {
              const set = (patch: Partial<typeof c>) =>
                update((u) => ({ ...u, rentComps: u.rentComps.map((x) => (x.id === c.id ? { ...x, ...patch } : x)) }));
              return (
                <tr key={c.id} className={`border-t border-oak-line/60 ${c.include ? "" : "opacity-50"}`}>
                  <td className={td}>
                    <input
                      type="checkbox"
                      aria-label="Include comp"
                      checked={c.include}
                      onChange={(e) => set({ include: e.target.checked })}
                    />
                  </td>
                  <td className={td}>
                    <TextField ariaLabel="Address" value={c.address} onChange={(address) => set({ address })} />
                  </td>
                  <td className={td}>
                    <SelectField ariaLabel="Type" value={c.type} options={mixTypes} onChange={(type) => set({ type })} />
                  </td>
                  <td className={td}>
                    <NumField ariaLabel="Comp SF" value={c.sf} onChange={(sf) => set({ sf })} />
                  </td>
                  <td className={td}>
                    <NumField ariaLabel="Rent per SF" prefix="$" decimals={2} value={c.rentPsf} onChange={(rentPsf) => set({ rentPsf })} />
                  </td>
                  <td className={td}>
                    <SelectField ariaLabel="Lease type" value={c.leaseType} options={LEASE_TYPES} onChange={(leaseType) => set({ leaseType })} />
                  </td>
                  <td className="w-8 text-right">
                    <SmallButton danger title="Remove" onClick={() => update((u) => ({ ...u, rentComps: u.rentComps.filter((x) => x.id !== c.id) }))}>
                      ×
                    </SmallButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 text-[12px] font-semibold text-oak-ink">Comp-implied metrics (by asset component)</div>
      <table className="mt-1 w-full">
        <thead>
          <tr>
            <th className={th}>Component</th>
            <th className={thR}>SF</th>
            <th className={thR}>Avg sale $/SF</th>
            <th className={thR}>Avg cap</th>
            <th className={thR}>Avg rent $/SF</th>
            <th className={thR}>Implied value</th>
            <th className={thR}>Implied rent</th>
          </tr>
        </thead>
        <tbody>
          {calc.typeStats.map((t) => (
            <tr key={t.type} className="border-t border-oak-line/60">
              <td className={td}>
                {t.type}
                {(t.saleFallback || t.rentFallback) && (
                  <span className="ml-1.5 text-[11px] text-amber-700" title="No comps of this type; using all included comps">
                    (all comps)
                  </span>
                )}
              </td>
              <td className={tdR}>{t.sf.toLocaleString()}</td>
              <td className={tdR}>{t.salePsf != null ? money(t.salePsf, 0) : "—"}</td>
              <td className={tdR}>{t.saleCap != null ? `${t.saleCap.toFixed(2)}%` : "—"}</td>
              <td className={tdR}>{t.rentPsf != null ? money(t.rentPsf, 2) : "—"}</td>
              <td className={tdR}>{t.salePsf != null ? money(t.salePsf * t.sf) : "—"}</td>
              <td className={tdR}>{t.rentPsf != null ? money(t.rentPsf * t.sf) : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-oak-line font-semibold">
            <td className={td}>Blended</td>
            <td className={tdR}>{calc.subjectSf.toLocaleString()}</td>
            <td className={tdR}>{calc.subjectSf > 0 && calc.salesCompValue > 0 ? money(calc.salesCompValue / calc.subjectSf, 0) : "—"}</td>
            <td className={tdR}>{calc.compWeightedCap != null ? `${calc.compWeightedCap.toFixed(2)}%` : "—"}</td>
            <td className={tdR}>{calc.subjectSf > 0 && calc.marketRent > 0 ? money(calc.marketRent / calc.subjectSf, 2) : "—"}</td>
            <td className={tdR}>{money(calc.salesCompValue)}</td>
            <td className={tdR}>{money(calc.marketRent)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="mt-3 flex flex-wrap gap-2">
        <SmallButton
          title="Set both cap rates to the SF-weighted average of included sale comps"
          onClick={() => {
            if (calc.compWeightedCap == null) return;
            const cap = Math.round(calc.compWeightedCap * 100) / 100;
            update((u) => ({ ...u, capRateCurrent: cap, capRateProforma: cap }));
          }}
        >
          Set cap rates from comps
        </SmallButton>
        <SmallButton
          title="Set each asset component's pro forma rent per unit from the average rent $/SF of its included rent comps"
          onClick={() => {
            const psfByType = new Map(calc.typeStats.map((t) => [t.type, t.rentPsf]));
            update((u) => ({
              ...u,
              mix: u.mix.map((m) => {
                const psf = psfByType.get(m.type);
                return psf && m.sf > 0 ? { ...m, proformaRent: Math.round((psf * m.sf) / 12) } : m;
              }),
            }));
          }}
        >
          Set pro forma rents from comps
        </SmallButton>
      </div>
    </Card>
  );
}
