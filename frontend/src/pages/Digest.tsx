import { useState } from "react";
import { useDigestPreview, useSendDigest } from "../hooks/useDigest";
import type { DigestStats } from "../types/digest";

/* ─── Stats Summary Cards ─── */
function StatsOverview({ stats }: { stats: DigestStats }) {
  return (
    <div className="space-y-4">
      {/* Main stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Active Users</p>
          <p className="text-2xl font-bold">{stats.active_users}</p>
          <p className="text-xs text-gray-600">of {stats.total_users} total</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Sessions</p>
          <p className="text-2xl font-bold">{stats.total_sessions}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Watch Hours</p>
          <p className="text-2xl font-bold">{stats.total_watch_hours}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">New Items</p>
          <p className="text-2xl font-bold">{stats.new_library_items}</p>
        </div>
      </div>

      {/* Operational health */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Alerts</p>
          <p className="text-lg font-bold">{stats.alerts_triggered}</p>
          {stats.alerts_unresolved > 0 && (
            <p className="text-xs text-red-400">
              {stats.alerts_unresolved} unresolved
            </p>
          )}
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Automation Runs</p>
          <p className="text-lg font-bold">{stats.automation_executions}</p>
          {stats.automation_failures > 0 && (
            <p className="text-xs text-red-400">
              {stats.automation_failures} failures
            </p>
          )}
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">High Sharing Score</p>
          <p className="text-lg font-bold text-orange-400">
            {stats.high_sharing_users}
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Servers Online</p>
          <p className="text-lg font-bold text-green-400">
            {stats.servers.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top watchers */}
        {stats.top_watchers.length > 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-4 py-3">
              <h3 className="text-sm font-semibold">Top Watchers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium text-right">Hours</th>
                    <th className="px-4 py-2 font-medium text-right">
                      Sessions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {stats.top_watchers.map((w, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-gray-300">{w.username}</td>
                      <td className="px-4 py-2 text-right text-gray-400">
                        {w.hours}h
                      </td>
                      <td className="px-4 py-2 text-right text-gray-400">
                        {w.sessions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top content */}
        {stats.top_content.length > 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-4 py-3">
              <h3 className="text-sm font-semibold">Most Played</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                    <th className="px-4 py-2 font-medium">Title</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium text-right">Plays</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {stats.top_content.map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-gray-300">
                        {c.title}
                        {c.subtitle && (
                          <span className="text-gray-500">
                            {" "}
                            - {c.subtitle}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {c.type || ""}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-400">
                        {c.plays}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Digest() {
  const [days, setDays] = useState(7);
  const [showPreview, setShowPreview] = useState(false);
  const { data: preview, refetch, isFetching } = useDigestPreview(days);
  const sendMutation = useSendDigest();

  function handleGenerate() {
    refetch();
    setShowPreview(false);
  }

  async function handleSend() {
    await sendMutation.mutateAsync(days);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Digest</h1>
          <p className="mt-1 text-sm text-gray-500">
            Weekly summary sent automatically every Monday at 8 AM UTC via
            notification agents with the "admin_digest" trigger enabled.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Period:</label>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1 text-sm font-medium ${
                days === d
                  ? "bg-brand-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isFetching}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {isFetching ? "Generating..." : "Generate Preview"}
        </button>
        {preview && (
          <>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="rounded-lg border border-gray-700 px-4 py-1.5 text-sm text-gray-400 hover:text-white"
            >
              {showPreview ? "Hide Email" : "View Email"}
            </button>
            <button
              onClick={handleSend}
              disabled={sendMutation.isPending}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
            >
              {sendMutation.isPending ? "Sending..." : "Send Now"}
            </button>
          </>
        )}
        {sendMutation.isSuccess && (
          <span className="text-sm text-green-400">
            {sendMutation.data?.message}
          </span>
        )}
      </div>

      {/* Stats cards (always shown when preview loaded) */}
      {preview && <StatsOverview stats={preview.stats} />}

      {/* Email preview */}
      {showPreview && preview && (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div className="border-b border-gray-800 bg-gray-900 px-4 py-2">
            <p className="text-xs text-gray-500">Email Preview</p>
          </div>
          <iframe
            srcDoc={preview.html}
            className="w-full bg-white"
            style={{ height: "700px", border: "none" }}
            title="Digest Preview"
          />
        </div>
      )}

      {/* Info when no preview */}
      {!preview && !isFetching && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-500">
            Click "Generate Preview" to compile the admin digest with current
            stats.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            To enable automatic weekly digests, add the "admin_digest" trigger to
            your notification agents in Settings.
          </p>
        </div>
      )}
    </div>
  );
}
