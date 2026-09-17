// Executive-summary highlight extraction.
// Set ANTHROPIC_API_KEY in the server environment to switch this from a stub to a live call —
// no other code changes needed.
export async function extractHighlights(text: string, filename: string): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !text.trim()) {
    return [
      `"${filename}" uploaded and stored.`,
      "AI highlight extraction isn't configured yet — set ANTHROPIC_API_KEY on the server to enable live summarization of uploaded executive summaries.",
    ];
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: `You are reviewing a commercial real estate executive summary for a private lender. Extract 5-8 concise bullet-point highlights covering deal terms, property details, sponsor strengths, and any risks. Return ONLY a JSON array of plain strings, no markdown, no commentary.\n\n${text.slice(0, 15000)}`,
        },
      ],
    });
    const block = msg.content[0];
    const raw = block && block.type === "text" ? block.text : "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [String(parsed)];
  } catch (err) {
    return [
      `"${filename}" uploaded and stored.`,
      `AI highlight extraction failed: ${err instanceof Error ? err.message : "unknown error"}`,
    ];
  }
}
