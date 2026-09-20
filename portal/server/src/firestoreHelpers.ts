import { FieldValue } from "firebase-admin/firestore";
import { db, bucket } from "./firebaseAdmin.js";

export async function deleteSubcollection(leadId: string, subcollection: string) {
  const snap = await db.collection("leads").doc(leadId).collection(subcollection).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
}

export async function deleteLeadCascade(leadId: string) {
  await Promise.all([
    deleteSubcollection(leadId, "stageHistory"),
    deleteSubcollection(leadId, "comments"),
    deleteSubcollection(leadId, "chatMessages"),
    deleteSubcollection(leadId, "tasks"),
    deleteSubcollection(leadId, "documents"),
    deleteSubcollection(leadId, "underwriting"),
    deleteSubcollection(leadId, "mapShapes"),
    deleteSubcollection(leadId, "escrowChecklist"),
  ]);

  const partnersSnap = await db.collection("partners").where("deal_ids", "array-contains", leadId).get();
  if (!partnersSnap.empty) {
    const partnerBatch = db.batch();
    partnersSnap.docs.forEach((d) => partnerBatch.update(d.ref, { deal_ids: FieldValue.arrayRemove(leadId) }));
    await partnerBatch.commit();
  }

  const alertsSnap = await db.collection("alerts").where("leadId", "==", leadId).get();
  const alertBatch = db.batch();
  alertsSnap.docs.forEach((d) => alertBatch.delete(d.ref));
  if (!alertsSnap.empty) await alertBatch.commit();

  const [files] = await bucket.getFiles({ prefix: `uploads/${leadId}/` });
  const [summaryFiles] = await bucket.getFiles({ prefix: `exec-summaries/${leadId}/` });
  await Promise.all([...files, ...summaryFiles].map((f) => f.delete().catch(() => {})));

  await db.collection("leads").doc(leadId).delete();
}
