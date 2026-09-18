import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { DOCUMENT_CATEGORIES, type LeadDocument } from "../types";
import { NotifySelect } from "./NotifySelect";

interface Props {
  leadId: string;
  currentUser: string;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function CategoryBin({
  category,
  docs,
  onUpload,
  onDelete,
  leadId,
}: {
  category: string;
  docs: LeadDocument[];
  onUpload: (category: string, file: File) => void;
  onDelete: (docId: string) => void;
  leadId: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
          <div className="text-[13px] font-semibold text-oak-ink">{category}</div>
          <div className="text-[11px] text-oak-sagelight">{docs.length}</div>
        </div>
        <div className="mt-0.5 text-[11px] text-oak-sagelight">Drop PDFs here or click to browse</div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
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
                className="flex items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-black/[0.03]"
              >
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

export function DataRoomTab({ leadId, currentUser }: Props) {
  const [docs, setDocs] = useState<LeadDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notify, setNotify] = useState<string[]>([]);

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_CATEGORIES.map((category) => (
          <CategoryBin
            key={category}
            category={category}
            docs={docs.filter((d) => d.category === category)}
            onUpload={handleUpload}
            onDelete={handleDelete}
            leadId={leadId}
          />
        ))}
      </div>
    </div>
  );
}
