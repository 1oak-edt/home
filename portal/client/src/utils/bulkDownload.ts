import { api } from "../api";
import type { LeadDocument } from "../types";
import { safeFilename, saveBlob } from "./download";

const CONCURRENCY = 4;

// Names inside the zip: one folder per data room category, with " (2)" suffixes for same-named files.
function zipPaths(docs: LeadDocument[]): string[] {
  const used = new Set<string>();
  return docs.map((d) => {
    const folder = safeFilename(d.category);
    const name = safeFilename(d.original_name);
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    let path = `${folder}/${name}`;
    for (let n = 2; used.has(path.toLowerCase()); n++) path = `${folder}/${stem} (${n})${ext}`;
    used.add(path.toLowerCase());
    return path;
  });
}

export async function downloadDocumentsZip(
  leadId: string,
  docs: LeadDocument[],
  zipName: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ failed: string[] }> {
  if (docs.length === 1) {
    await api.downloadDocument(leadId, docs[0].id, docs[0].original_name);
    return { failed: [] };
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const paths = zipPaths(docs);
  const failed: string[] = [];
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < docs.length) {
      const i = next++;
      try {
        zip.file(paths[i], await api.fetchDocumentBlob(leadId, docs[i].id));
      } catch {
        failed.push(docs[i].original_name);
      }
      onProgress?.(++done, docs.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, docs.length) }, worker));

  if (failed.length === docs.length) throw new Error("None of the selected files could be downloaded.");

  // PDFs are already compressed, so store them as-is for speed.
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  saveBlob(blob, `${safeFilename(zipName)}.zip`);
  return { failed };
}
