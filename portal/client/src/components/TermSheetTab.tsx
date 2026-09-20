import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "../api";
import logoUrl from "../assets/1oak-logo.png";
import { TERM_SHEET_TEMPLATE, guarantorNamesText, type Block, type Part } from "../data/termSheetTemplate";
import type { Lead } from "../types";
import {
  FIELDS,
  MONTHS,
  countWord,
  defaultTermSheet,
  emptyFieldKeys,
  firstPaymentMonth,
  formatLongDate,
  formatMoney,
  formatPct,
  guarantorSuffix,
  normalizeTermSheet,
  parseNum,
  totalFeesText,
  wordsText,
  type FieldDef,
  type FieldKey,
  type TermSheetData,
  type WordsKind,
} from "../utils/termSheet";
import { normalizeUnderwriting } from "../utils/underwriting";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

const SAVE_DELAY_MS = 900;

interface TsContext {
  data: TermSheetData;
  setValue: (key: FieldKey, value: string) => void;
  setGuarantors: (names: string[]) => void;
}

const TsCtx = createContext<TsContext | null>(null);

function useTs(): TsContext {
  const ctx = useContext(TsCtx);
  if (!ctx) throw new Error("Term sheet field used outside the term sheet");
  return ctx;
}

const fieldBase =
  "inline-block max-w-full border-0 border-b border-dashed px-1 py-0 align-baseline font-[inherit] text-[inherit] leading-[inherit] text-oak-ink focus:border-oak-dark focus:outline-none";
const emptyTone = "border-amber-600 bg-amber-200/80 placeholder:text-amber-900/50";
const filledTone = "border-oak-gold bg-oak-goldlight/50";

// Inline fill-in field. Money and percent fields show formatted text until focused so typing stays plain.
function F({ k, as }: { k: FieldKey; as?: "words" }) {
  const { data, setValue } = useTs();
  const def: FieldDef = FIELDS[k];
  const value = data.values[k] ?? "";
  const [focused, setFocused] = useState(false);
  const empty = !value.trim();
  const tone = empty ? emptyTone : filledTone;
  const common = { "data-empty": empty ? "true" : undefined, "aria-label": def.label, title: def.label } as const;

  if (def.kind === "long") {
    return (
      <textarea
        {...common}
        rows={3}
        value={value}
        placeholder={def.placeholder}
        onChange={(e) => setValue(k, e.target.value)}
        className={`mt-1 block w-full rounded border px-2 py-1.5 font-[inherit] text-[inherit] leading-[inherit] text-oak-ink focus:border-oak-dark focus:outline-none ${
          empty ? "border-amber-600 bg-amber-200/80 placeholder:text-amber-900/50" : "border-oak-gold bg-oak-goldlight/50"
        }`}
      />
    );
  }

  if (def.kind === "date") {
    return (
      <input
        {...common}
        type="date"
        value={value}
        onChange={(e) => setValue(k, e.target.value)}
        className={`${fieldBase} ${tone}`}
      />
    );
  }

  if (def.kind === "month") {
    return (
      <select {...common} value={value} onChange={(e) => setValue(k, e.target.value)} className={`${fieldBase} ${tone}`}>
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    );
  }

  let shown = value;
  if (!focused && !empty) {
    const n = parseNum(value);
    if (n !== null && def.kind === "money") shown = formatMoney(n, def.wholeDollars);
    else if (n !== null && def.kind === "pct") shown = formatPct(n);
    else if (n !== null && as === "words") shown = countWord(n, false);
  }
  const numeric = def.kind === "money" || def.kind === "pct" || def.kind === "int";

  return (
    <input
      {...common}
      inputMode={numeric ? "decimal" : undefined}
      value={shown}
      placeholder={def.placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => setValue(k, e.target.value)}
      style={{ width: `${Math.max(shown.length || def.placeholder.length, 3) + 1}ch` }}
      className={`${fieldBase} ${tone}`}
    />
  );
}

const Blank = ({ children }: { children: ReactNode }) => <span className="text-amber-700">[{children}]</span>;

// Spelled-out version of a numeric field, so the words can never disagree with the digits beside them.
function Words({
  k,
  kind,
  cap = false,
  style = "legal",
}: {
  k: FieldKey;
  kind: WordsKind;
  cap?: boolean;
  style?: "legal" | "plain";
}) {
  const { data } = useTs();
  const text = wordsText(kind, parseNum(data.values[k]), cap, style);
  if (text !== null) return <>{text}</>;
  return <Blank>{kind === "dollars" ? "amount in words" : kind === "pct" ? "percent in words" : "number in words"}</Blank>;
}

function GuarantorNames() {
  const { data, setGuarantors } = useTs();
  const names = data.guarantors.length ? data.guarantors : [""];

  return (
    <>
      {names.map((name, i) => (
        <span key={i}>
          <input
            aria-label={`Guarantor ${i + 1}`}
            data-empty={name.trim() ? undefined : "true"}
            value={name}
            placeholder="Guarantor name"
            onChange={(e) => setGuarantors(names.map((n, j) => (j === i ? e.target.value : n)))}
            style={{ width: `${Math.max(name.length || 14, 8) + 1}ch` }}
            className={`${fieldBase} ${name.trim() ? filledTone : emptyTone}`}
          />
          {names.length > 1 && (
            <button
              type="button"
              onClick={() => setGuarantors(names.filter((_, j) => j !== i))}
              className="mx-0.5 align-baseline font-sans text-[12px] text-oak-sagelight hover:text-red-700"
              aria-label={`Remove guarantor ${i + 1}`}
              title="Remove guarantor"
            >
              ×
            </button>
          )}
          {i < names.length - 1 && (i === names.length - 2 ? " and " : ", ")}
        </span>
      ))}
      <button
        type="button"
        onClick={() => setGuarantors([...names, ""])}
        className="ml-2 rounded border border-oak-line px-1.5 py-0 align-baseline font-sans text-[11px] font-semibold text-oak-sage hover:border-oak-sage hover:text-oak-ink"
      >
        + Add guarantor
      </button>
      {guarantorSuffix(names)}
    </>
  );
}

function GuarantorText() {
  const { data } = useTs();
  const text = guarantorNamesText(data);
  return text.startsWith("[") ? <Blank>Guarantor name(s)</Blank> : <>{text}</>;
}

function LongDate({ k }: { k: FieldKey }) {
  const { data } = useTs();
  const text = formatLongDate(data.values[k] ?? "");
  return text ? <>{text}</> : <Blank>date</Blank>;
}

function TotalFees() {
  const { data } = useTs();
  const text = totalFeesText(data.values);
  return text ? <>{text}</> : <Blank>total fee</Blank>;
}

function FirstPaymentMonth() {
  const { data } = useTs();
  const month = firstPaymentMonth(data.values);
  return month ? <>{month}</> : <Blank>month</Blank>;
}

function renderParts(parts: Part[]): ReactNode {
  return parts.map((part, i) => {
    if (typeof part === "string") return <Fragment key={i}>{part}</Fragment>;
    if ("f" in part) return <F key={i} k={part.f} as={part.as} />;
    if ("w" in part) return <Words key={i} k={part.w} kind={part.kind} cap={part.cap} style={part.style} />;
    switch (part.c) {
      case "guarantorsRow":
        return <GuarantorNames key={i} />;
      case "guarantorText":
        return <GuarantorText key={i} />;
      case "totalFees":
        return <TotalFees key={i} />;
      case "firstPaymentMonth":
        return <FirstPaymentMonth key={i} />;
      case "letterDate":
        return <LongDate key={i} k="date" />;
    }
  });
}

function Row({
  label,
  children,
  optional,
}: {
  label: string;
  children: ReactNode;
  optional?: { included: boolean; onChange: (included: boolean) => void };
}) {
  return (
    <div className="mb-3.5 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[210px_minmax(0,1fr)]">
      <div className="font-bold">
        {label}
        {optional && (
          <label className="mt-1 flex cursor-pointer items-center gap-1.5 font-sans text-[12px] font-medium text-oak-sage">
            <input
              type="checkbox"
              checked={optional.included}
              onChange={(e) => optional.onChange(e.target.checked)}
              className="h-3.5 w-3.5 accent-oak-dark"
            />
            Include this clause
          </label>
        )}
      </div>
      <div>
        {optional && !optional.included ? (
          <span className="font-sans text-[13px] italic text-oak-sagelight">Not included in this term sheet.</span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

const SigLine = () => <span className="inline-block w-64 border-b border-oak-ink align-bottom">&nbsp;</span>;

export function TermSheetTab({ lead }: { lead: Lead }) {
  const [data, setData] = useState<TermSheetData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [meta, setMeta] = useState<{ updated_at: string | null; updated_by: string | null } | null>(null);
  const [pdfState, setPdfState] = useState<"idle" | "confirm" | "working" | "error">("idle");

  const latest = useRef<TermSheetData | null>(null);
  const pending = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const paperRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setLoadError(null);
    Promise.all([api.getTermSheet(lead.id), api.getUnderwriting(lead.id).catch(() => ({ data: null }))])
      .then(([saved, uwRes]) => {
        const uw = uwRes.data ? normalizeUnderwriting(uwRes.data, lead) : null;
        const defaults = defaultTermSheet(lead, uw);
        const model = saved.data ? normalizeTermSheet(saved.data, defaults) : defaults;
        latest.current = model;
        setData(model);
        setMeta({ updated_at: saved.updated_at, updated_by: saved.updated_by });
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load the term sheet."));
    // Reload only when switching deals; later edits to the deal must not overwrite work in progress here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  useEffect(() => {
    load();
  }, [load]);

  const flush = useCallback(async () => {
    if (!pending.current || !latest.current) return;
    pending.current = false;
    setStatus("saving");
    try {
      const res = await api.saveTermSheet(lead.id, latest.current);
      setMeta(res);
      setStatus(pending.current ? "unsaved" : "saved");
    } catch {
      pending.current = true;
      setStatus("error");
    }
  }, [lead.id]);

  const update = useCallback(
    (fn: (d: TermSheetData) => TermSheetData) => {
      if (!latest.current) return;
      const next = fn(latest.current);
      latest.current = next;
      setData(next);
      pending.current = true;
      setStatus("unsaved");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush]
  );

  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
      if (pending.current) void flush();
    };
  }, [flush]);

  const ctx = useMemo<TsContext | null>(
    () =>
      data && {
        data,
        setValue: (key, value) => update((d) => ({ ...d, values: { ...d.values, [key]: value } })),
        setGuarantors: (names) => update((d) => ({ ...d, guarantors: names })),
      },
    [data, update]
  );

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
        {loadError}{" "}
        <button className="font-semibold underline" onClick={load}>
          Retry
        </button>
      </div>
    );
  }
  if (!data || !ctx) return <div className="py-16 text-center text-oak-sagelight">Loading term sheet...</div>;

  const guarantorBlank = data.guarantors.length === 0 || data.guarantors.some((g) => !g.trim());
  const blanks = emptyFieldKeys(data).length + (guarantorBlank ? 1 : 0);
  const namedGuarantors = data.guarantors.filter((g) => g.trim());

  const statusText: Record<SaveStatus, string> = {
    saved: meta?.updated_at
      ? `Saved${meta.updated_by ? ` by ${meta.updated_by}` : ""} · ${new Date(meta.updated_at).toLocaleString()}`
      : "Not saved yet — changes save automatically",
    saving: "Saving…",
    unsaved: "Unsaved changes…",
    error: "Save failed — will retry on next change",
  };

  async function runDownload() {
    if (!latest.current) return;
    setPdfState("working");
    try {
      const { downloadTermSheetPdf } = await import("../utils/termSheetPdf");
      await downloadTermSheetPdf(latest.current);
      setPdfState("idle");
    } catch {
      setPdfState("error");
    }
  }

  function renderBlock(block: Block): ReactNode {
    switch (block.type) {
      case "letterhead":
        return (
          <div className="mb-6 flex items-start justify-between gap-6">
            <img src={logoUrl} alt="1Oak" className="h-14 w-auto" />
            <div className="text-right text-[13px] leading-snug">
              <div>1Oak Capital, LLC</div>
              <div>
                <F k="letterheadLine1" />
              </div>
              <div>
                <F k="letterheadLine2" />
              </div>
            </div>
          </div>
        );
      case "lines":
        return (
          <div className={block.align === "center" ? "mb-4 text-center" : "mb-4 flex flex-col items-start gap-1.5"}>
            {block.lines.map((line, i) => (
              <div key={i}>{renderParts(line)}</div>
            ))}
          </div>
        );
      case "p":
        return (
          <p className={block.bold ? "mb-2 mt-5 font-bold" : "mb-3"}>
            {block.lead && (
              <>
                <b>{block.lead}</b>&nbsp;&nbsp;
              </>
            )}
            {renderParts(block.parts)}
          </p>
        );
      case "row": {
        const optional =
          block.optional === "extension"
            ? { included: data!.includeExtension, onChange: (v: boolean) => update((d) => ({ ...d, includeExtension: v })) }
            : block.optional === "holdback"
              ? { included: data!.includeHoldback, onChange: (v: boolean) => update((d) => ({ ...d, includeHoldback: v })) }
              : undefined;
        return (
          <Row label={block.label} optional={optional}>
            {renderParts(block.parts)}
          </Row>
        );
      }
      case "list": {
        const items = block.items.map((item, i) => <li key={i}>{renderParts(item)}</li>);
        if (block.style === "bullet") return <ul className="mb-5 list-disc space-y-1 pl-8">{items}</ul>;
        return (
          <ol className={`mb-4 space-y-1.5 pl-8 ${block.style === "alpha" ? "list-[lower-alpha]" : "list-decimal"}`}>{items}</ol>
        );
      }
      case "signatures":
        return (
          <>
            <p className="mb-3">Sincerely,</p>
            <div className="mb-5 space-y-2">
              <div className="font-bold">LENDER: 1Oak Capital LLC</div>
              <div>
                By: <SigLine />
              </div>
              <div>
                Name: <F k="lenderSignatory" />
              </div>
              <div>
                Date: <LongDate k="date" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-bold">ACCEPTED AND AGREED:</div>
              <div className="font-bold">
                BORROWER: <F k="borrower" />
              </div>
              <div>
                By: <SigLine />
              </div>
              <div>
                Name: <F k="borrowerSignatory" />
              </div>
              <div>
                Title: <F k="borrowerTitle" />
              </div>
              <div>
                Date: <SigLine />
              </div>
              <div className="pt-2 font-bold">GUARANTORS:</div>
              {(namedGuarantors.length ? namedGuarantors : [""]).map((name, i) => (
                <div key={i} className="space-y-2">
                  <div>
                    By: <SigLine />
                  </div>
                  <div>
                    Name: {name ? name : <Blank>Guarantor name</Blank>}, Individually
                  </div>
                  <div>
                    Date: <SigLine />
                  </div>
                </div>
              ))}
            </div>
          </>
        );
    }
  }

  function jumpToBlank() {
    const el = paperRef.current?.querySelector<HTMLElement>('[data-empty="true"]');
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  }

  return (
    <TsCtx.Provider value={ctx}>
      <div className="mx-auto max-w-[900px]">
        <div className="sticky -top-5 z-10 -mx-1 -mt-5 bg-oak-cream px-1 pb-2 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-oak-line bg-white px-4 py-2.5">
            <div>
              <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">Term Sheet</div>
              <div className="text-[13px] text-oak-ink">
                {blanks === 0 ? (
                  <span className="font-semibold text-oak-sage">All fields filled in</span>
                ) : (
                  <>
                    <span className="font-semibold">{blanks}</span> field{blanks === 1 ? "" : "s"} still blank
                  </>
                )}
                <span className="ml-2 text-[11px] text-oak-sagelight">Highlighted blanks need a value</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] ${status === "error" ? "font-semibold text-red-700" : "text-oak-sagelight"}`}>
                {statusText[status]}
              </span>
              {blanks > 0 && (
                <button
                  onClick={jumpToBlank}
                  className="rounded-md border border-oak-line px-2.5 py-1 text-[12px] font-semibold text-oak-sage hover:border-oak-sage hover:text-oak-ink"
                >
                  Go to next blank
                </button>
              )}
              <button
                onClick={() => (blanks > 0 ? setPdfState("confirm") : runDownload())}
                disabled={pdfState === "working"}
                className="rounded-md border border-oak-dark bg-oak-dark px-3 py-1 text-[12px] font-semibold text-oak-cream hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
              >
                {pdfState === "working" ? "Creating PDF…" : "Download PDF"}
              </button>
            </div>
          </div>
          {pdfState === "confirm" && (
            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              <span>
                {blanks} field{blanks === 1 ? " is" : "s are"} still blank and will show as [bracketed placeholders] in the PDF.
              </span>
              <button onClick={runDownload} className="rounded-md border border-amber-400 bg-white px-2.5 py-1 text-[12px] font-semibold hover:bg-amber-100">
                Download anyway
              </button>
              <button onClick={() => setPdfState("idle")} className="text-[12px] font-medium underline">
                Keep editing
              </button>
            </div>
          )}
          {pdfState === "error" && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              Couldn't create the PDF. Try again.
            </div>
          )}
        </div>

        <div
          ref={paperRef}
          className="mt-3 rounded-lg border border-oak-line bg-white px-6 py-8 text-[14.5px] leading-[1.55] text-oak-ink shadow-card sm:px-12"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          {TERM_SHEET_TEMPLATE.map((block, i) => (
            <Fragment key={i}>{renderBlock(block)}</Fragment>
          ))}
        </div>
      </div>
    </TsCtx.Provider>
  );
}
