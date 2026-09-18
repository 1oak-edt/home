import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { createAlerts } from "../alerts.js";
import { ah } from "../asyncHandler.js";
import { bucket, db } from "../firebaseAdmin.js";
import { DOCUMENT_CATEGORIES } from "../types.js";

export const documentsRouter = Router({ mergeParams: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function categorySlug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function leadDocuments(leadId: string) {
  return db.collection("leads").doc(leadId).collection("documents");
}

function storagePath(leadId: string, category: string, storedName: string) {
  return `uploads/${leadId}/${categorySlug(category)}/${storedName}`;
}

documentsRouter.get<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const snap = await leadDocuments(req.params.leadId).orderBy("created_at", "desc").get();
    res.json(snap.docs.map((d) => ({ id: d.id, lead_id: req.params.leadId, ...d.data() })));
  })
);

documentsRouter.post<{ leadId: string }>(
  "/",
  upload.single("file"),
  ah<{ leadId: string }>(async (req, res) => {
    const category = req.body.category;
    const uploadedBy = req.body.uploaded_by ?? null;
    if (!(DOCUMENT_CATEGORIES as readonly string[]).includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const id = nanoid();
    const ext = path.extname(req.file.originalname) || "";
    const storedName = `${id}${ext}`;
    const filePath = storagePath(req.params.leadId, category, storedName);

    await bucket.file(filePath).save(req.file.buffer, {
      contentType: req.file.mimetype || "application/pdf",
    });

    const created_at = new Date().toISOString();
    const doc = {
      category,
      original_name: req.file.originalname,
      stored_name: storedName,
      size: req.file.size,
      uploaded_by: uploadedBy,
      created_at,
    };
    await leadDocuments(req.params.leadId).doc(id).set(doc);

    let notify: string[] = [];
    try {
      notify = req.body.notify ? JSON.parse(req.body.notify) : [];
    } catch {
      notify = [];
    }
    if (notify.length) {
      await createAlerts({
        leadId: req.params.leadId,
        sourceType: "document",
        sourceId: id,
        message: `${uploadedBy ?? "Someone"} uploaded "${req.file.originalname}" to ${category}`,
        createdBy: uploadedBy,
        recipients: notify,
      });
    }

    res.status(201).json({ id, lead_id: req.params.leadId, ...doc });
  })
);

documentsRouter.get<{ leadId: string; docId: string }>(
  "/:docId/download",
  ah<{ leadId: string; docId: string }>(async (req, res) => {
    const docSnap = await leadDocuments(req.params.leadId).doc(req.params.docId).get();
    if (!docSnap.exists) return res.status(404).json({ error: "Document not found" });
    const doc = docSnap.data() as { category: string; stored_name: string; original_name: string };

    const filePath = storagePath(req.params.leadId, doc.category, doc.stored_name);
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) return res.status(404).json({ error: "File missing in storage" });

    res.setHeader("Content-Disposition", `attachment; filename="${doc.original_name}"`);
    file.createReadStream().on("error", () => res.status(500).end()).pipe(res);
  })
);

documentsRouter.delete<{ leadId: string; docId: string }>(
  "/:docId",
  ah<{ leadId: string; docId: string }>(async (req, res) => {
    const ref = leadDocuments(req.params.leadId).doc(req.params.docId);
    const docSnap = await ref.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Document not found" });
    const doc = docSnap.data() as { category: string; stored_name: string };

    const filePath = storagePath(req.params.leadId, doc.category, doc.stored_name);
    await bucket.file(filePath).delete({ ignoreNotFound: true });
    await ref.delete();
    res.status(204).send();
  })
);
