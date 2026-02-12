import { useState } from "react";
import { useSessionHistory } from "../hooks/useSessions";

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Sessions() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSessionHistory(page);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Session History</h1>

      {isLoading ? (
        <div className="py-10 text-center text-gray-500">Loading...</div>
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No session history yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Server</th>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">IP Address</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Watched</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.items.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 font-medium">
                      {h.grandparent_title
                        ? `${h.grandparent_title} - S${h.season_number}E${h.episode_number}`
                        : h.item_title || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{h.username}</td>
                    <td className="px-4 py-3 text-gray-400">{h.server_name}</td>
                    <td className="px-4 py-3 text-gray-500">{h.device_name}</td>
                    <td className="px-4 py-3 text-gray-500">{h.ip_address || "N/A"}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatDuration(h.play_duration_sec)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          h.completed ? "text-green-400" : "text-yellow-400"
                        }
                      >
                        {Math.round(h.watched_pct)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(h.started_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(data.page - 1) * data.page_size + 1}–
              {Math.min(data.page * data.page_size, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={data.page * data.page_size >= data.total}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
