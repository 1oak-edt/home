import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { ChatMessage } from "../types";
import { formatDateTime, initials } from "../utils/format";
import { DeleteControl } from "./DeleteControl";
import { NotifySelect } from "./NotifySelect";

interface Props {
  leadId: string;
  currentUser: string;
}

export function ChatPanel({ leadId, currentUser }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [notify, setNotify] = useState<string[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getChat(leadId).then(setMessages);
  }, [leadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function remove(id: string) {
    setDeleteError(null);
    try {
      await api.deleteChat(leadId, id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Couldn't delete that message.");
      throw e;
    }
  }

  async function submit() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    const created = await api.sendChat(leadId, currentUser, body, notify);
    setMessages((prev) => [...prev, created]);
    setNotify([]);
  }

  return (
    <div className="flex flex-col rounded-lg border border-oak-line bg-white p-4">
      <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">
        Deal Chat
      </div>

      <div className="scrollbar-thin mt-3 flex max-h-72 min-h-[100px] flex-col gap-2 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-[13px] text-oak-sagelight">
            No messages yet — start the conversation on this deal.
          </div>
        )}
        {messages.map((m) => {
          const mine = m.author === currentUser;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <div
                title={m.author}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${
                  mine ? "bg-oak-gold text-oak-darker" : "bg-oak-dark text-oak-cream"
                }`}
              >
                {initials(m.author)}
              </div>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  mine ? "bg-oak-dark text-oak-cream" : "bg-black/[0.04] text-oak-ink"
                }`}
              >
                <div className={`text-[11px] font-semibold ${mine ? "text-oak-gold" : "text-oak-sage"}`}>
                  {m.author}
                  {mine && <span className="ml-1 font-normal opacity-70">(you)</span>}
                </div>
                <div className="break-words text-[13px]">{m.body}</div>
                <div className={`mt-0.5 flex items-center gap-2 text-[10px] ${mine ? "text-oak-cream/60" : "text-oak-sagelight"}`}>
                  <span>{formatDateTime(m.created_at)}</span>
                  <DeleteControl tone={mine ? "dark" : "light"} onDelete={() => remove(m.id)} />
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
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
          placeholder={`Message as ${currentUser}...`}
          className="flex-1 rounded-md border border-oak-line bg-white px-3 py-2 text-sm focus:border-oak-sage focus:outline-none"
        />
        <button
          onClick={submit}
          className="rounded-md bg-oak-gold px-3 py-2 text-[13px] font-semibold text-oak-darker hover:brightness-95"
        >
          Send
        </button>
      </div>
      <div className="mt-2">
        <NotifySelect currentUser={currentUser} selected={notify} onChange={setNotify} />
      </div>
    </div>
  );
}
