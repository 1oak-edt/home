// The API reports validation failures as JSON ({ fieldErrors: { email: ["Invalid email"] } }); turn that into a sentence.
export function errorMessage(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : "";
  try {
    const parsed = JSON.parse(raw) as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const messages = [
      ...(parsed.formErrors ?? []),
      ...Object.entries(parsed.fieldErrors ?? {}).flatMap(([field, msgs]) => msgs.map((m) => `${field.replace(/_/g, " ")}: ${m}`)),
    ];
    if (messages.length > 0) return messages.join("; ").replace(/^./, (c) => c.toUpperCase());
  } catch {
    // not a JSON validation error; fall through to the plain message
  }
  return raw || fallback;
}
