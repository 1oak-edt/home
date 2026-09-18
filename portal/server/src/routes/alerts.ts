import { Router } from "express";
import { z } from "zod";
import { ah } from "../asyncHandler.js";
import { db } from "../firebaseAdmin.js";

export const alertsRouter = Router();

// Firestore requires a composite index for `where(recipient==) + orderBy(created_at)`.
// Rather than depend on a manually-created index, fetch by the single equality
// filter and sort/filter in memory -- fine at this app's per-user alert volume.

alertsRouter.get(
  "/",
  ah(async (req, res) => {
    const user = String(req.query.user ?? "");
    if (!user) return res.status(400).json({ error: "user query param required" });
    const onlyUnread = req.query.unread === "true";

    const snap = await db.collection("alerts").where("recipient", "==", user).get();
    let alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    if (onlyUnread) alerts = alerts.filter((a) => !a.read_at);
    alerts.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    res.json(alerts.slice(0, 100));
  })
);

alertsRouter.get(
  "/unread-count",
  ah(async (req, res) => {
    const user = String(req.query.user ?? "");
    if (!user) return res.status(400).json({ error: "user query param required" });

    const snap = await db.collection("alerts").where("recipient", "==", user).get();
    const count = snap.docs.filter((d) => !d.data().read_at).length;
    res.json({ count });
  })
);

alertsRouter.post(
  "/:id/read",
  ah<{ id: string }>(async (req, res) => {
    await db.collection("alerts").doc(req.params.id).update({ read_at: new Date().toISOString() });
    res.status(204).send();
  })
);

const readAllSchema = z.object({ user: z.string().min(1) });

alertsRouter.post(
  "/read-all",
  ah(async (req, res) => {
    const parsed = readAllSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const snap = await db.collection("alerts").where("recipient", "==", parsed.data.user).get();
    const unread = snap.docs.filter((d) => !d.data().read_at);
    if (unread.length) {
      const batch = db.batch();
      const read_at = new Date().toISOString();
      unread.forEach((d) => batch.update(d.ref, { read_at }));
      await batch.commit();
    }
    res.status(204).send();
  })
);
