// Single source of truth for stage colors, shared by the pipeline board and the deal map.
export const STAGE_HEX: Record<string, string> = {
  Intake: "#8A9280", // sagelight — remain
  Qualified: "#D6DAAA",
  Submitted: "#B0BC71",
  Escrow: "#68743D",
  Financed: "#D0932C",
};

export const CLOSED_HEX = "#B91C1C"; // Disqualified & Lost — unchanged
