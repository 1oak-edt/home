import { Router } from "express";
import { z } from "zod";
import { ah } from "../asyncHandler.js";
import { db } from "../firebaseAdmin.js";

export const mapShapesRouter = Router({ mergeParams: true });

// Points are objects, not [lat, lng] pairs, because Firestore rejects nested arrays.
const point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const shapeId = z.string().min(1).max(40);

const shape = z.discriminatedUnion("kind", [
  z.object({ id: shapeId, kind: z.literal("polygon"), points: z.array(point).min(3).max(500) }),
  z.object({ id: shapeId, kind: z.literal("polyline"), points: z.array(point).min(2).max(500) }),
  z.object({ id: shapeId, kind: z.literal("circle"), center: point, radius: z.number().positive().max(2_000_000) }),
]);

const shapesInput = z.object({ shapes: z.array(shape).max(100) });

function shapesDoc(leadId: string) {
  return db.collection("leads").doc(leadId).collection("mapShapes").doc("main");
}

mapShapesRouter.get<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const snap = await shapesDoc(req.params.leadId).get();
    if (!snap.exists) return res.json({ shapes: [], updated_at: null, updated_by: null });
    res.json(snap.data());
  })
);

mapShapesRouter.put<{ leadId: string }>(
  "/",
  ah<{ leadId: string }>(async (req, res) => {
    const leadSnap = await db.collection("leads").doc(req.params.leadId).get();
    if (!leadSnap.exists) return res.status(404).json({ error: "Lead not found" });

    const parsed = shapesInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const doc = {
      shapes: parsed.data.shapes,
      updated_at: new Date().toISOString(),
      updated_by: req.user?.name ?? null,
    };
    await shapesDoc(req.params.leadId).set(doc);
    res.json(doc);
  })
);
