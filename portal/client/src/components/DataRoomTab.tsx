import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { DOCUMENT_CATEGORIES, type LeadDocument } from "../types";
import { downloadDocumentsZip } from "../utils/bulkDownload";
import { NotifySelect } from "./NotifySelect";

interface Props {
  leadId: string;
  borrowerName: string;
  currentUser: string;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function TriCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

function CategoryBin({
  category,
  docs,
  selected,
  onToggle,
  onToggleMany,
  onUpload,
  onDelete,
  leadId,
}: {
  category: string;
  docs: LeadDocument[];
  selected: Set<string>;
  onToggle: (docId: string) => void;
  onToggleMany: (docIds: string[], on: boolean) => void;
  onUpload: (category: string, file: File) => void;
  onDelete: (docId: string) => void;
  leadId: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedHere = docs.filter((d) => selected.has(d.id)).length;

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => {
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        onUpload(category, f);
      }
    });
  }

  return (
    <div className="rounded-lg border border-oak-line bg-white">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-t-lg border-b border-oak-line px-3 py-3 transition-colors ${
          dragOver ? "bg-oak-gold/15" : "hover:bg-black/[0.015]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {docs.length > 0 && (
              <TriCheckbox
                label={`Select all files in ${category}`}
                checked={selectedHere === docs.length}
                indeterminate={selectedHere > 0 && selectedHere < docs.length}
                onChange={(on) =>
                  onToggleMany(
                    docs.map((d) => d.id),
                    on
                  )
                }
              />
            )}
            <div className="text-[13px] font-semibold text-oak-ink">{category}</div>
          </div>
          <div className="text-[11px] text-oak-sagelight">{docs.length}</div>
        </div>
        <div className="mt-0.5 text-[11px] text-oak-sagelight">Drop PDFs here or click to browse</div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <div className="max-h-40 overflow-y-auto p-2">
        {docs.length === 0 ? (
          <div className="px-1 py-1 text-[12px] text-oak-sagelight">No files</div>
        ) : (
          <div className="flex flex-col gap-1">
            {docs.map((d) => (
              <div
                key={d.id}
                className={`flex items-center gap-2 rounded px-1.5 py-1 hover:bg-black/[0.03] ${
                  selected.has(d.id) ? "bg-oak-goldlight/40" : ""
                }`}
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${d.original_name}`}
                  checked={selected.has(d.id)}
                  onChange={() => onToggle(d.id)}
                />
                <button
                  onClick={() => api.downloadDocument(leadId, d.id, d.original_name)}
                  className="min-w-0 flex-1 truncate text-left text-[12px] font-medium text-oak-sage hover:underline"
                  title={d.original_name}
                >
                  {d.original_name}
                </button>
                <span className="shrink-0 text-[11px] text-oak-sagelight">{formatSize(d.size)}</span>
                <button
                  onClick={() => onDelete(d.id)}
                  className="shrink-0 rounded p-0.5 text-oak-sagelight hover:text-red-700"
                  aria-label="Delete file"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DataRoomTab({ leadId, borrowerName, currentUser }: Props) {
  const [docs, setDocs] = useState<LeadDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notify, setNotify] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    api.getDocuments(leadId).then(setDocs);
  }, [leadId]);

  async function handleUpload(category: string, file: File) {
    try {
      const created = await api.uploadDocument(leadId, category, file, currentUser, notify);
      setDocs((prev) => [created, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  async function handleDelete(docId: string) {
    await api.deleteDocument(leadId, docId);
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(docId);
      return next;
    });
  }

  function toggleMany(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  const selectedDocs = docs.filter((d) => selected.has(d.id));
  const selectedBytes = selectedDocs.reduce((sum, d) => sum + d.size, 0);
  const busy = progress !== null;

  async function handleBulkDownload() {
    if (selectedDocs.length === 0 || busy) return;
    setError(null);
    setProgress({ done: 0, total: selectedDocs.length });
    try {
      const date = new Date().toISOString().slice(0, 10);
      const { failed } = await downloadDocumentsZip(leadId, selectedDocs, `${borrowerName} - Data Room ${date}`, (done, total) =>
        setProgress({ done, total })
      );
      if (failed.length > 0) {
        setError(`${failed.length} file${failed.length > 1 ? "s" : ""} could not be downloaded and ${failed.length > 1 ? "were" : "was"} left out: ${failed.join(", ")}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </div>
      )}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-oak-line bg-white px-3 py-2">
        <span className="text-[12px] text-oak-sagelight">On upload:</span>
        <NotifySelect currentUser={currentUser} selected={notify} onChange={setNotify} />
      </div>
      {docs.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-oak-line bg-white px-3 py-2">
          <label className="flex items-center gap-2 text-[12px] font-medium text-oak-ink">
            <TriCheckbox
              label="Select all files"
              checked={selected.size === docs.length}
              indeterminate={selected.size > 0 && selected.size < docs.length}
              onChange={(on) =>
                toggleMany(
                  docs.map((d) => d.id),
                  on
                )
              }
            />
            Select all ({docs.length})
          </label>
          <span className="text-[12px] text-oak-sagelight">
            {selected.size > 0 ? `${selected.size} selected · ${formatSize(selectedBytes)}` : "Select files to download in bulk"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && !busy && (
              <button
                onClick={() => setSelected(new Set())}
                className="text-[12px] font-medium text-oak-sage hover:text-oak-ink hover:underline"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleBulkDownload}
              disabled={selected.size === 0 || busy}
              className="rounded-md bg-oak-dark px-3 py-1.5 text-[12px] font-semibold text-oak-cream hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy
                ? `Preparing ${progress.done}/${progress.total}…`
                : selected.size > 1
                  ? `Download ${selected.size} files (.zip)`
                  : "Download selected"}
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_CATEGORIES.map((category) => (
          <CategoryBin
            key={category}
            category={category}
            docs={docs.filter((d) => d.category === category)}
            selected={selected}
            onToggle={(id) => toggleMany([id], !selected.has(id))}
            onToggleMany={toggleMany}
            onUpload={handleUpload}
            onDelete={handleDelete}
            leadId={leadId}
          />
        ))}
      </div>
    </div>
  );
}
