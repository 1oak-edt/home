// One-time script to bulk-create the 6 team Firebase Auth accounts.
//
// Setup:
//   1. In Firebase Console: Project settings (gear) -> Service accounts -> Generate new private key.
//      Save the downloaded file as server/scripts/service-account-key.json (already .gitignore'd).
//   2. npm install firebase-admin --workspace server
//   3. Fill in each person's real email below.
//   4. node server/scripts/create-users.js
//
// This does NOT print or transmit passwords anywhere else -- it only sets the
// initial password in Firebase Auth. Tell each person their temp password
// through whatever channel you're already using, and have them change it
// after first login.

import { initializeApp } from "firebase-admin/app";
import { cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";

const serviceAccount = JSON.parse(
  readFileSync(new URL("./service-account-key.json", import.meta.url))
);

initializeApp({ credential: cert(serviceAccount) });

const users = [
  { name: "Charlie Thomas", email: "REPLACE_WITH_REAL_EMAIL", password: "Meridian#Granite16" },
  { name: "Jeff Thomas", email: "REPLACE_WITH_REAL_EMAIL", password: "Amber!Ivory24" },
  { name: "Devin Hunter", email: "REPLACE_WITH_REAL_EMAIL", password: "Prairie$Lumen44" },
  { name: "Eric Thomas", email: "REPLACE_WITH_REAL_EMAIL", password: "Vesper@Lumen84" },
  { name: "Griffin Hillier", email: "REPLACE_WITH_REAL_EMAIL", password: "Ivory&Summit35" },
  { name: "Richie Guerra", email: "REPLACE_WITH_REAL_EMAIL", password: "Vesper#Umber68" },
];

for (const u of users) {
  if (u.email.startsWith("REPLACE_WITH")) {
    console.log(`Skipping ${u.name} — fill in a real email first.`);
    continue;
  }
  try {
    const created = await getAuth().createUser({
      email: u.email,
      password: u.password,
      displayName: u.name,
      emailVerified: false,
    });
    console.log(`Created ${u.name} <${u.email}> — uid ${created.uid}`);
  } catch (err) {
    console.error(`Failed for ${u.name} <${u.email}>:`, err.message);
  }
}
