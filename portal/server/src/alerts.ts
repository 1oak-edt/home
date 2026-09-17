import { nanoid } from "nanoid";
import { db } from "./db.js";

export function createAlerts(params: {
  leadId: string;
  sourceType: "comment" | "chat" | "task" | "document";
  sourceId: string | null;
  message: string;
  createdBy: string | null;
  recipients: string[];
}) {
  const { leadId, sourceType, sourceId, message, createdBy, recipients } = params;
  const uniqueRecipients = Array.from(new Set(recipients)).filter((r) => r && r !== createdBy);
  if (uniqueRecipients.length === 0) return;

  const created_at = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO alerts (id, lead_id, recipient, source_type, source_id, message, created_by, created_at, read_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`
  );
  for (const recipient of uniqueRecipients) {
    insert.run(nanoid(), leadId, recipient, sourceType, sourceId, message, createdBy, created_at);
  }
}

export function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
