import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const uploadsDir = path.join(dataDir, "uploads");
export const execSummariesDir = path.join(dataDir, "exec-summaries");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(execSummariesDir)) fs.mkdirSync(execSummariesDir, { recursive: true });

const dbPath = path.join(dataDir, "1oak.db");
export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

const schema = `
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  borrower_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  property_address TEXT,
  city TEXT,
  state TEXT,
  asset_class TEXT NOT NULL,
  loan_type TEXT NOT NULL,
  loan_amount REAL NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'Intake',
  prior_stage TEXT,
  lost_reason TEXT,
  source TEXT,
  assigned_to TEXT,
  expected_close_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  stage_changed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stage_history (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  message TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_history_lead ON stage_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_comments_lead ON comments(lead_id);
CREATE INDEX IF NOT EXISTS idx_chat_lead ON chat_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_lead ON documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_alerts_recipient ON alerts(recipient, read_at);
`;

db.exec(schema);

const NEW_COLUMNS: Array<{ name: string; ddl: string }> = [
  { name: "purchase_price", ddl: "REAL" },
  { name: "equity_contribution", ddl: "REAL" },
  { name: "interest_rate", ddl: "REAL" },
  { name: "term_months", ddl: "INTEGER" },
  { name: "exit_strategy", ddl: "TEXT" },
  { name: "sponsor_names", ddl: "TEXT NOT NULL DEFAULT '[]'" },
  { name: "use_of_proceeds", ddl: "TEXT NOT NULL DEFAULT '[]'" },
  { name: "latitude", ddl: "REAL" },
  { name: "longitude", ddl: "REAL" },
  { name: "exec_summary_filename", ddl: "TEXT" },
  { name: "exec_summary_highlights", ddl: "TEXT" },
  { name: "exec_summary_uploaded_at", ddl: "TEXT" },
];

const existingColumns = new Set(
  (db.prepare("PRAGMA table_info(leads)").all() as Array<{ name: string }>).map((c) => c.name)
);

for (const col of NEW_COLUMNS) {
  if (!existingColumns.has(col.name)) {
    db.exec(`ALTER TABLE leads ADD COLUMN ${col.name} ${col.ddl}`);
  }
}
