import type { jsPDF } from "jspdf";
import { TERM_SHEET_TEMPLATE, guarantorNamesText, partText, partsText } from "../data/termSheetTemplate";
import { safeFilename, saveBlob } from "./download";
import type { TermSheetData } from "./termSheet";

export interface LetterheadImages {
  logo: string;
  watermark: string;
}

// US Letter, 1" side margins, Times 11pt to match the original term sheet.
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 72;
const FONT_SIZE = 11;
const LEADING = 13.5;
const BODY_TOP = 118;
const BODY_BOTTOM = PAGE_H - 66;
const LABEL_W = 132;
const CONTENT_X = MARGIN + LABEL_W;
const CONTENT_W = PAGE_W - MARGIN - CONTENT_X;

export function termSheetFileName(data: TermSheetData): string {
  const street = (data.values.propertyAddress ?? "").split(",")[0].trim() || (data.values.borrower ?? "").trim();
  return `${safeFilename(`1Oak Capital LLC - Term Sheet${street ? ` (${street})` : ""}`)}.pdf`;
}

export async function buildTermSheetPdf(data: TermSheetData, images?: LetterheadImages): Promise<jsPDF> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "pt", format: "letter" });

  const excluded = (optional?: "extension" | "holdback") =>
    (optional === "extension" && !data.includeExtension) || (optional === "holdback" && !data.includeHoldback);

  function drawHeader() {
    if (images) {
      // Aliases let jsPDF embed each image once for all pages; compression keeps the file small enough to email.
      doc.addImage(images.watermark, "PNG", 0, 0, 266, 94.4, "letterhead-watermark", "MEDIUM");
      doc.addImage(images.logo, "PNG", 47, 16, 160, 60.8, "letterhead-logo", "MEDIUM");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);
    const lines = ["1Oak Capital, LLC", data.values.letterheadLine1, data.values.letterheadLine2].map((l) => (l ?? "").trim()).filter(Boolean);
    lines.forEach((line, i) => doc.text(line, PAGE_W - MARGIN, 70 + i * 9.5, { align: "right" }));
    doc.setTextColor(0, 0, 0);
  }

  let y = BODY_TOP;
  drawHeader();

  const setBody = (bold = false) => {
    doc.setFont("times", bold ? "bold" : "normal");
    doc.setFontSize(FONT_SIZE);
    doc.setTextColor(0, 0, 0);
  };

  function need(height: number) {
    if (y + height > BODY_BOTTOM) {
      doc.addPage();
      drawHeader();
      y = BODY_TOP;
    }
  }

  const split = (text: string, width: number, bold = false): string[] => {
    setBody(bold);
    return doc.splitTextToSize(text, width) as string[];
  };

  // Baseline sits ~10pt below the top of each line box.
  function textLine(text: string, x: number, bold = false, align?: "center") {
    setBody(bold);
    doc.text(text, x, y + 10, align ? { align } : undefined);
  }

  function paragraph(text: string, opts: { bold?: boolean; center?: boolean; lead?: string; gap?: number } = {}) {
    const full = opts.lead ? `${opts.lead}  ${text}` : text;
    const lines = split(full, PAGE_W - MARGIN * 2, opts.bold);
    lines.forEach((line, i) => {
      need(LEADING);
      if (opts.lead && i === 0) {
        // Bold lead-in ("RE:") followed by the normal-weight remainder on the same line.
        textLine(opts.lead, MARGIN, true);
        setBody(true);
        const leadW = doc.getTextWidth(`${opts.lead}  `);
        setBody(false);
        doc.text(line.slice(opts.lead.length + 2), MARGIN + leadW, y + 10);
      } else if (opts.center) {
        textLine(line, PAGE_W / 2, opts.bold, "center");
      } else {
        textLine(line, MARGIN, opts.bold);
      }
      y += LEADING;
    });
    y += opts.gap ?? 8;
  }

  function row(label: string, text: string) {
    const labelLines = split(label, LABEL_W - 10, true);
    const bodyLines = split(text, CONTENT_W);
    const count = Math.max(labelLines.length, bodyLines.length);
    need(LEADING * Math.min(count, 3));
    for (let i = 0; i < count; i++) {
      need(LEADING);
      if (i < labelLines.length) textLine(labelLines[i], MARGIN, true);
      if (i < bodyLines.length) textLine(bodyLines[i], CONTENT_X);
      y += LEADING;
    }
    y += 8;
  }

  function list(style: "decimal" | "alpha" | "bullet", items: string[]) {
    const textX = MARGIN + 30;
    items.forEach((item, i) => {
      const marker = style === "decimal" ? `${i + 1}.` : style === "alpha" ? `${String.fromCharCode(97 + i)}.` : "•";
      const lines = split(item, PAGE_W - MARGIN - textX);
      need(LEADING * Math.min(lines.length, 2));
      lines.forEach((line, j) => {
        need(LEADING);
        if (j === 0) textLine(marker, MARGIN + 8);
        textLine(line, textX);
        y += LEADING;
      });
      y += 3;
    });
    y += 6;
  }

  function signatureLine(label: string) {
    need(LEADING + 8);
    textLine(label, MARGIN);
    setBody();
    const start = MARGIN + doc.getTextWidth(label) + 4;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(start, y + 11, start + 190, y + 11);
    y += LEADING + 8;
  }

  function plainLine(text: string, bold = false) {
    need(LEADING + 4);
    textLine(text, MARGIN, bold);
    y += LEADING + 4;
  }

  function signatures() {
    paragraph("Sincerely,", { gap: 6 });
    need(LEADING * 8);
    plainLine("LENDER: 1Oak Capital LLC", true);
    signatureLine("By: ");
    plainLine(`Name: ${partText({ f: "lenderSignatory" }, data)}`);
    plainLine(`Date: ${partText({ c: "letterDate" }, data)}`);
    y += 6;

    need(LEADING * 10);
    plainLine("ACCEPTED AND AGREED:", true);
    plainLine(`BORROWER: ${partText({ f: "borrower" }, data)}`, true);
    signatureLine("By: ");
    plainLine(`Name: ${partText({ f: "borrowerSignatory" }, data)}`);
    plainLine(`Title: ${partText({ f: "borrowerTitle" }, data)}`);
    signatureLine("Date: ");
    y += 2;

    need(LEADING * 5);
    plainLine("GUARANTORS:", true);
    const names = data.guarantors.filter((g) => g.trim());
    (names.length ? names : [guarantorNamesText(data)]).forEach((name) => {
      need(LEADING * 5);
      signatureLine("By: ");
      plainLine(`Name: ${name}, Individually`);
      signatureLine("Date: ");
    });
  }

  for (const block of TERM_SHEET_TEMPLATE) {
    switch (block.type) {
      case "letterhead":
        break;
      case "lines":
        block.lines.forEach((line) => paragraph(partsText(line, data), { center: block.align === "center", gap: 4 }));
        y += 6;
        break;
      case "p":
        paragraph(partsText(block.parts, data), { bold: block.bold, lead: block.lead, gap: block.bold ? 4 : 8 });
        break;
      case "row":
        if (!excluded(block.optional)) row(block.label, partsText(block.parts, data));
        break;
      case "list":
        list(
          block.style,
          block.items.map((item) => partsText(item, data))
        );
        break;
      case "signatures":
        signatures();
        break;
    }
  }

  const borrower = (data.values.borrower ?? "").trim();
  doc.setProperties({
    title: `Term Sheet${borrower ? ` - ${borrower}` : ""}`,
    subject: "1Oak Capital proposed loan terms",
    author: "1Oak Capital, LLC",
    creator: "1Oak Tracker",
  });
  return doc;
}

async function toDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function downloadTermSheetPdf(data: TermSheetData): Promise<void> {
  const [{ default: logoUrl }, { default: watermarkUrl }] = await Promise.all([
    import("../assets/1oak-logo.png"),
    import("../assets/1oak-letterhead-watermark.png"),
  ]);
  const images = { logo: await toDataUrl(logoUrl), watermark: await toDataUrl(watermarkUrl) };
  const doc = await buildTermSheetPdf(data, images);
  saveBlob(doc.output("blob"), termSheetFileName(data));
}
