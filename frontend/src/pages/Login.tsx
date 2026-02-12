import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuthStore } from "../stores/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isSetup ? "/auth/setup" : "/auth/login";
      const { data } = await apiClient.post(endpoint, { username, password });
      login(data.access_token, username);
      navigate("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Login failed";
      if (msg.includes("No admin password configured")) {
        setIsSetup(true);
        setError("No admin account configured. Create one below.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      {/* Subtle radial glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)]" />

      <div className="relative w-full max-w-sm space-y-6 rounded-xl border border-gray-800/80 bg-gray-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold shadow-lg shadow-brand-900/30">
            ML
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight">MediaLedger</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isSetup ? "Create your admin account" : "Sign in to continue"}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-gray-700/80 bg-gray-800/80 px-3 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-700/80 bg-gray-800/80 px-3 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-brand-500 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {isSetup ? "Creating..." : "Signing in..."}
              </span>
            ) : isSetup ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {!isSetup && (
          <button
            onClick={() => setIsSetup(true)}
            className="w-full text-center text-xs text-gray-500 transition-colors hover:text-gray-300"
          >
            First time? Set up admin account
          </button>
        )}
      </div>
    </div>
  );
}
