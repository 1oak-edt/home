import { nanoid } from "nanoid";
import { db } from "./firebaseAdmin.js";

export async function createAlerts(params: {
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

  const leadDoc = await db.collection("leads").doc(leadId).get();
  const borrowerName = (leadDoc.data()?.borrower_name as string) ?? "Unknown deal";

  const created_at = new Date().toISOString();
  const batch = db.batch();
  for (const recipient of uniqueRecipients) {
    const ref = db.collection("alerts").doc(nanoid());
    batch.set(ref, {
      leadId,
      borrower_name: borrowerName,
      recipient,
      source_type: sourceType,
      source_id: sourceId,
      message,
      created_by: createdBy,
      created_at,
      read_at: null,
    });
  }
  await batch.commit();
}

export function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// Deleting a comment or chat message also removes the notifications that quote it, so the bell never shows deleted text.
export async function deleteAlertsForSource(leadId: string, sourceType: "comment" | "chat", sourceId: string) {
  const snap = await db.collection("alerts").where("source_id", "==", sourceId).get();
  const matches = snap.docs.filter((d) => d.data().leadId === leadId && d.data().source_type === sourceType);
  if (matches.length === 0) return;
  const batch = db.batch();
  matches.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
