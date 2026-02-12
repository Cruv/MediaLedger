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
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold">
            ML
          </div>
          <h1 className="mt-3 text-xl font-bold">MediaLedger</h1>
          <p className="text-sm text-gray-500">
            {isSetup ? "Create your admin account" : "Sign in to continue"}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
          >
            {loading ? "..." : isSetup ? "Create Account" : "Sign In"}
          </button>
        </form>

        {!isSetup && (
          <button
            onClick={() => setIsSetup(true)}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-300"
          >
            First time? Set up admin account
          </button>
        )}
      </div>
    </div>
  );
}
