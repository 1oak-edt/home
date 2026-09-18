import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-oak-cream">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-oak-line bg-white p-8 shadow-card"
      >
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-oak-dark font-condensed text-lg font-semibold text-oak-cream">
            1O
          </div>
          <div className="leading-tight">
            <div className="font-condensed text-lg font-semibold tracking-wide text-oak-dark">
              1OAK CAPITAL
            </div>
            <div className="text-[11px] uppercase tracking-widest text-oak-sage">Deal Pipeline</div>
          </div>
        </div>

        <label className="mb-3 block text-[13px] font-medium text-oak-ink">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="mt-1 w-full rounded-md border border-oak-line px-3 py-2 text-sm focus:border-oak-sage focus:outline-none"
          />
        </label>

        <label className="mb-4 block text-[13px] font-medium text-oak-ink">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-oak-line px-3 py-2 text-sm focus:border-oak-sage focus:outline-none"
          />
        </label>

        {error && <div className="mb-4 text-[13px] text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-oak-gold px-4 py-2 text-sm font-semibold text-oak-darker shadow-card transition-transform hover:brightness-95 active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
