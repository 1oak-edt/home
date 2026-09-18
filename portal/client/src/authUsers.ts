import type { User } from "firebase/auth";
import { APP_USERS } from "./types";

// Placeholder mapping until the remaining team members' real Firebase accounts
// exist; update as accounts are created with different addresses.
const EMAIL_TO_NAME: Record<string, (typeof APP_USERS)[number]> = {
  "eric@1oaklending.com": "Eric Thomas",
  "charlie@1oaklending.com": "Charlie Thomas",
  "jeff@1oaklending.com": "Jeff Thomas",
  "devin@1oaklending.com": "Devin Hunter",
  "griffin@1oaklending.com": "Griffin Hillier",
  "richie@1oaklending.com": "Richie Guerra",
};

export function nameForUser(user: User): string {
  const email = user.email?.toLowerCase() ?? "";
  return EMAIL_TO_NAME[email] ?? user.displayName ?? user.email ?? "Unknown";
}
