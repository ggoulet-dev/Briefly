import { useState } from "react";
import { useAuth } from "../lib/AuthContext";

export function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password, name);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === "signup") {
      setSignupSuccess(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-lg font-bold text-white">
            B
          </div>
          <span className="text-xl font-semibold tracking-tight text-zinc-100">
            Briefly
          </span>
        </div>

        {signupSuccess ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-sm text-zinc-300">
              Check your email to confirm your account, then sign in.
            </p>
            <button
              onClick={() => {
                setSignupSuccess(false);
                setMode("signin");
              }}
              className="mt-4 text-sm text-blue-400 hover:text-blue-300"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h1 className="mb-5 text-center text-lg font-medium text-zinc-100">
              {mode === "signin" ? "Sign In" : "Create Account"}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Min 6 characters"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {mode === "signin" ? "Signing in..." : "Creating account..."}
                  </span>
                ) : mode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError("");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                {mode === "signin"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
