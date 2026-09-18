import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { ChatMessage } from "../types";
import { formatDate } from "../utils/format";
import { NotifySelect } from "./NotifySelect";

interface Props {
  leadId: string;
  currentUser: string;
}

export function ChatPanel({ leadId, currentUser }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [notify, setNotify] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getChat(leadId).then(setMessages);
  }, [leadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

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
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  mine ? "bg-oak-dark text-oak-cream" : "bg-black/[0.04] text-oak-ink"
                }`}
              >
                {!mine && <div className="text-[11px] font-semibold text-oak-sage">{m.author}</div>}
                <div className="text-[13px]">{m.body}</div>
                <div className={`mt-0.5 text-[10px] ${mine ? "text-oak-cream/60" : "text-oak-sagelight"}`}>
                  {formatDate(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

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
