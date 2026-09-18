import { useRef, useState } from "react";
import { api } from "../api";
import type { Lead } from "../types";
import { formatDate } from "../utils/format";

interface Props {
  lead: Lead;
  onUpdated: (lead: Lead) => void;
}

export function ExecSummaryPanel({ lead, onUpdated }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const result = await api.uploadExecSummary(lead.id, file);
      onUpdated({
        ...lead,
        exec_summary_filename: result.filename,
        exec_summary_highlights: result.highlights,
        exec_summary_uploaded_at: result.uploaded_at,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload executive summary.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-oak-line bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">
          Executive Summary
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="rounded-md border border-oak-line px-2.5 py-1 text-[12px] font-semibold text-oak-sage hover:border-oak-sage hover:text-oak-ink disabled:opacity-60"
        >
          {uploading ? "Uploading..." : lead.exec_summary_filename ? "Replace PDF" : "Upload PDF"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && <div className="mt-2 text-[12px] font-medium text-red-700">{error}</div>}

      {lead.exec_summary_filename ? (
        <>
          <button
            onClick={() => api.openExecSummaryFile(lead.id)}
            className="mt-2 block truncate text-left text-[13px] font-medium text-oak-sage underline-offset-2 hover:underline"
          >
            {lead.exec_summary_filename}
          </button>
          {lead.exec_summary_uploaded_at && (
            <div className="text-[11px] text-oak-sagelight">
              Uploaded {formatDate(lead.exec_summary_uploaded_at)}
            </div>
          )}
          {lead.exec_summary_highlights.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-oak-sage">
                Deal Summary Highlights
              </div>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {lead.exec_summary_highlights.map((h, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-oak-ink">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-oak-gold" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="mt-2 text-[13px] text-oak-sagelight">
          No executive summary uploaded yet. Drop in the deal's exec summary PDF to get highlights here.
        </div>
      )}
    </div>
  );
}
