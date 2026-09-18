import { Router } from "express";
import { ah } from "../asyncHandler.js";
import { db } from "../firebaseAdmin.js";
import { ACTIVE_STAGES, type Lead } from "../types.js";

export const metricsRouter = Router();

metricsRouter.get("/", ah(async (_req, res) => {
  const snap = await db.collection("leads").get();
  const leads = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown as Lead[];

  const active = leads.filter((l) => (ACTIVE_STAGES as readonly string[]).includes(l.stage));
  const financed = leads.filter((l) => l.stage === "Financed");
  const disqualified = leads.filter((l) => l.stage === "Disqualified");
  const lost = leads.filter((l) => l.stage === "Lost");
  const closedOut = disqualified.length + lost.length;

  const sum = (arr: Lead[]) => arr.reduce((acc, l) => acc + (l.loan_amount || 0), 0);

  const byStage = [...ACTIVE_STAGES, "Disqualified", "Lost"].map((stage) => {
    const inStage = leads.filter((l) => l.stage === stage);
    return {
      stage,
      count: inStage.length,
      totalAmount: sum(inStage),
    };
  });

  const byAssetClass = Object.entries(
    active.reduce<Record<string, { count: number; totalAmount: number }>>((acc, l) => {
      const key = l.asset_class || "Other";
      if (!acc[key]) acc[key] = { count: 0, totalAmount: 0 };
      acc[key].count += 1;
      acc[key].totalAmount += l.loan_amount || 0;
      return acc;
    }, {})
  ).map(([assetClass, v]) => ({ assetClass, ...v }));

  const totalDecided = financed.length + closedOut;

  res.json({
    activePipelineAmount: sum(active),
    activeDealCount: active.length,
    avgDealSize: active.length ? sum(active) / active.length : 0,
    financedCount: financed.length,
    financedAmount: sum(financed),
    disqualifiedCount: disqualified.length,
    lostCount: lost.length,
    closedOutCount: closedOut,
    winRate: totalDecided ? financed.length / totalDecided : null,
    byStage,
    byAssetClass,
  });
}));
