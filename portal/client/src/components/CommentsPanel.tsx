import { useEffect, useState } from "react";
import { api } from "../api";
import type { Comment } from "../types";
import { formatDateTime, initials } from "../utils/format";
import { DeleteControl } from "./DeleteControl";
import { NotifySelect } from "./NotifySelect";

interface Props {
  leadId: string;
  currentUser: string;
}

export function CommentsPanel({ leadId, currentUser }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [notify, setNotify] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getComments(leadId)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [leadId]);

  async function remove(id: string) {
    setDeleteError(null);
    try {
      await api.deleteComment(leadId, id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Couldn't delete that comment.");
      throw e;
    }
  }

  async function submit() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    const created = await api.addComment(leadId, currentUser, body, notify);
    setComments((prev) => [...prev, created]);
    setNotify([]);
  }

  return (
    <div className="rounded-lg border border-oak-line bg-white p-4">
      <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">Comments</div>

      <div className="mt-3 flex flex-col gap-3">
        {!loading && comments.length === 0 && (
          <div className="text-[13px] text-oak-sagelight">No comments yet.</div>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-oak-dark text-[10px] font-semibold text-oak-cream">
              {initials(c.author)}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-semibold text-oak-ink">{c.author}</span>
                {c.author === currentUser && <span className="text-[11px] text-oak-sagelight">(you)</span>}
                <span className="text-[11px] text-oak-sagelight">{formatDateTime(c.created_at)}</span>
                <span className="ml-auto">
                  <DeleteControl onDelete={() => remove(c.id)} />
                </span>
              </div>
              <div className="break-words text-[13px] text-oak-ink">{c.body}</div>
            </div>
          </div>
        ))}
      </div>
      {deleteError && <div className="mt-2 text-[12px] text-red-700">{deleteError}</div>}

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={`Comment as ${currentUser}...`}
          className="flex-1 rounded-md border border-oak-line bg-white px-3 py-2 text-sm focus:border-oak-sage focus:outline-none"
        />
        <button
          onClick={submit}
          className="rounded-md bg-oak-dark px-3 py-2 text-[13px] font-semibold text-oak-cream hover:brightness-110"
        >
          Post
        </button>
      </div>
      <div className="mt-2">
        <NotifySelect currentUser={currentUser} selected={notify} onChange={setNotify} />
      </div>
    </div>
  );
}
