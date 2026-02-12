import { useState } from "react";
import {
  useServers,
  useAddServer,
  useDeleteServer,
  useTestServer,
} from "../hooks/useServers";
import type { ServerCreate } from "../types/server";

const defaultForm: ServerCreate = {
  name: "",
  server_type: "jellyfin",
  base_url: "",
  api_key: "",
  poll_interval_sec: 10,
};

export default function ServerManagement() {
  const { data: servers, isLoading } = useServers();
  const addMutation = useAddServer();
  const deleteMutation = useDeleteServer();
  const testMutation = useTestServer();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ServerCreate>({ ...defaultForm });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMutation.mutateAsync(form);
      setForm({ ...defaultForm });
      setShowForm(false);
    } catch {
      // error is in addMutation.error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Servers</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "Add Server"}
        </button>
      </div>

      {/* Add server form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-gray-800 bg-gray-900 p-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Jellyfin Server"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Type</label>
              <select
                value={form.server_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    server_type: e.target.value as "emby" | "jellyfin",
                  })
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="jellyfin">Jellyfin</option>
                <option value="emby">Emby</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Base URL
              </label>
              <input
                type="url"
                required
                value={form.base_url}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                placeholder="http://192.168.1.50:8096"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">
                API Key
              </label>
              <input
                type="password"
                required
                value={form.api_key}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                placeholder="Enter API key"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {addMutation.error && (
            <p className="text-sm text-red-400">
              {(addMutation.error as Error).message || "Failed to add server"}
            </p>
          )}

          <button
            type="submit"
            disabled={addMutation.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {addMutation.isPending ? "Adding..." : "Add Server"}
          </button>
        </form>
      )}

      {/* Server list */}
      {isLoading ? (
        <div className="py-10 text-center text-gray-500">Loading...</div>
      ) : !servers || servers.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No servers configured yet. Click "Add Server" to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {servers.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{s.name}</p>
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                    {s.server_type}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{s.base_url}</p>
                {s.server_version && (
                  <p className="text-xs text-gray-600">v{s.server_version}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => testMutation.mutate(s.id)}
                  disabled={testMutation.isPending}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm hover:bg-gray-800"
                >
                  Test
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete server "${s.name}"?`)) {
                      deleteMutation.mutate(s.id);
                    }
                  }}
                  className="rounded-lg border border-red-900 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Test result toast */}
      {testMutation.data && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            testMutation.data.success
              ? "border-green-900 bg-green-950/50 text-green-400"
              : "border-red-900 bg-red-950/50 text-red-400"
          }`}
        >
          {testMutation.data.success
            ? `Connected! ${testMutation.data.server_name} v${testMutation.data.version}`
            : `Connection failed: ${testMutation.data.error}`}
        </div>
      )}
    </div>
  );
}
