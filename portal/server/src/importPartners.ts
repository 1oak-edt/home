// Usage: npx tsx src/importPartners.ts "<path to Broker Partners.csv>" [--dry]
import { readFileSync } from "node:fs";
import { nanoid } from "nanoid";
import { db } from "./firebaseAdmin.js";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

interface PartnerDoc {
  contact_name: string;
  preferred_name: string;
  company: string;
  type: string;
  email: string;
  phone: string;
  market: string;
  specialty: string;
  notes: string;
}

async function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) throw new Error('Pass the CSV path: npx tsx src/importPartners.ts "<file.csv>" [--dry]');
  const dry = flag === "--dry";

  const [header, ...body] = parseCsv(readFileSync(file, "utf-8"));
  const col = (name: string) => header.findIndex((h) => clean(h) === name);
  const idx = {
    contact: col("Point of Contact"),
    type: col("CRE / CLO"),
    company: col("Company Name"),
    name: col("Name"),
    email: col("Email"),
    phone: col("Phone"),
    market: col("Market / State"),
    specialty: col("Specialty"),
  };
  if (Object.values(idx).some((i) => i === -1)) throw new Error(`Unexpected columns: ${header.join(", ")}`);

  // One person can appear on several rows (same email, different phone): keep one record with every number.
  const byEmail = new Map<string, PartnerDoc>();
  for (const r of body) {
    const email = clean(r[idx.email]).toLowerCase();
    const phone = clean(r[idx.phone]);
    const existing = email ? byEmail.get(email) : undefined;
    if (existing) {
      if (phone && !existing.phone.includes(phone)) existing.phone = [existing.phone, phone].filter(Boolean).join(" / ");
      continue;
    }
    const type = clean(r[idx.type]).toUpperCase();
    byEmail.set(email || `row-${byEmail.size}`, {
      contact_name: clean(r[idx.contact]),
      preferred_name: clean(r[idx.name]),
      company: clean(r[idx.company]),
      type: type === "CRE" || type === "CLO" ? type : "Other",
      email,
      phone,
      market: clean(r[idx.market]).replace(/\bTennesse\b/g, "Tennessee"),
      specialty: clean(r[idx.specialty]),
      notes: "",
    });
  }

  const existingSnap = await db.collection("partners").get();
  const existingEmails = new Set(existingSnap.docs.map((d) => String(d.data().email ?? "").toLowerCase()).filter(Boolean));
  const toCreate = [...byEmail.values()].filter((p) => !p.email || !existingEmails.has(p.email));

  console.log(`${body.length} CSV rows -> ${byEmail.size} unique partners; ${byEmail.size - toCreate.length} already in the database`);
  if (dry) {
    console.log(`Dry run: would create ${toCreate.length}`);
    return;
  }

  const now = new Date().toISOString();
  const batch = db.batch();
  toCreate.forEach((p) => batch.set(db.collection("partners").doc(nanoid()), { ...p, deal_ids: [], created_at: now, updated_at: now }));
  await batch.commit();
  console.log(`Created ${toCreate.length} partners`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
