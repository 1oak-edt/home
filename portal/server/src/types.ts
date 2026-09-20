export const ACTIVE_STAGES = [
  "Intake",
  "Qualified",
  "Submitted",
  "Escrow",
  "Financed",
] as const;

export const CLOSED_STAGES = ["Disqualified", "Lost"] as const;

export const ALL_STAGES = [...ACTIVE_STAGES, ...CLOSED_STAGES] as const;

export type Stage = (typeof ALL_STAGES)[number];

export const ASSET_CLASSES = [
  "Multifamily",
  "Office",
  "Retail",
  "Industrial",
  "Hospitality",
  "Land",
  "Mixed-Use",
  "Self-Storage",
  "Single-Family / SFR",
  "Other",
] as const;

export const LOAN_TYPES = ["Acquisition", "Bridge", "Construction"] as const;

export const USE_OF_PROCEEDS_CATEGORIES = [
  "Lien Pay-Off",
  "Renovation",
  "Construction",
  "Interest Reserve",
] as const;

export const EXIT_STRATEGIES = [
  "Refinance",
  "Sale / Disposition",
  "Permanent Takeout",
  "Payoff at Maturity",
  "Other",
] as const;

export interface UseOfProceedsItem {
  category: string;
  amount: number;
}

export const EXECUTIVES = ["Eric Thomas", "Griffin Hillier", "Richie Guerra"] as const;

export const APP_USERS = [
  "Charlie Thomas",
  "Jeff Thomas",
  "Devin Hunter",
  "Eric Thomas",
  "Griffin Hillier",
  "Richie Guerra",
] as const;

export const PRESET_TASKS = [
  "Broker BOV",
  "Rent Comps",
  "Sale Comps",
  "Request Call",
  "Term Sheet",
] as const;

export const TASK_STATUSES = ["Open", "Done"] as const;

export const DOCUMENT_CATEGORIES = [
  "Borrower Information",
  "Property Financials",
  "BOV & Appraisals",
  "Leases",
  "Pictures & Aerials",
  "Permits & Plans",
  "Purchase Agreements",
  "Title Documents",
  "Environmental",
  "Mortgage Documents",
  "Tax Documents",
  "Miscellaneous",
] as const;

export interface Lead {
  id: string;
  borrower_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  property_address: string | null;
  city: string | null;
  state: string | null;
  asset_class: string;
  loan_type: string;
  loan_amount: number;
  purchase_price: number | null;
  equity_contribution: number | null;
  interest_rate: number | null;
  term_months: number | null;
  exit_strategy: string | null;
  sponsor_names: string[];
  use_of_proceeds: UseOfProceedsItem[];
  latitude: number | null;
  longitude: number | null;
  exec_summary_filename: string | null;
  exec_summary_highlights: string[];
  exec_summary_uploaded_at: string | null;
  stage: Stage;
  prior_stage: Stage | null;
  lost_reason: string | null;
  source: string | null;
  assigned_to: string | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  stage_changed_at: string;
}

export interface Comment {
  id: string;
  lead_id: string;
  author: string;
  body: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  lead_id: string;
  author: string;
  body: string;
  created_at: string;
}

export interface Task {
  id: string;
  lead_id: string;
  title: string;
  assignee: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface LeadDocument {
  id: string;
  lead_id: string;
  category: string;
  original_name: string;
  stored_name: string;
  size: number;
  uploaded_by: string | null;
  created_at: string;
}

export const PARTNER_TYPES = ["CRE", "CLO", "Other"] as const;
