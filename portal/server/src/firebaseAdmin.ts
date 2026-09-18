import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, "..", "scripts", "service-account-key.json");

const PROJECT_ID = "oak-portal-bde61";
const STORAGE_BUCKET = "oak-portal-bde61.firebasestorage.app";

if (!getApps().length) {
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
    initializeApp({ credential: cert(serviceAccount), storageBucket: STORAGE_BUCKET });
  } else {
    // Local dev: picks up `gcloud auth application-default login` credentials.
    // In Cloud Functions/Cloud Run: picks up Google's ambient credentials automatically.
    initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET });
  }
}

export const db = getFirestore();
export const auth = getAuth();
export const bucket = getStorage().bucket();
