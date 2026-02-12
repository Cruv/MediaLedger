import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuditLog } from "../hooks/useAudit";

const ACTION_COLORS: Record<string, string> = {
  "note.created": "bg-blue-900/40 text-blue-400",
  "note.updated": "bg-blue-900/40 text-blue-400",
  "note.deleted": "bg-red-900/40 text-red-400",
  "tag.assigned": "bg-purple-900/40 text-purple-400",
  "tag.unassigned": "bg-purple-900/40 text-purple-400",
  "tag.created": "bg-purple-900/40 text-purple-400",
  "tag.deleted": "bg-purple-900/40 text-purple-400",
  "user.disabled": "bg-red-900/40 text-red-400",
  "user.enabled": "bg-green-900/40 text-green-400",
  "rule.triggered": "bg-orange-900/40 text-orange-400",
  "rule.created": "bg-orange-900/40 text-orange-400",
  "alert.resolved": "bg-green-900/40 text-green-400",
};

const TARGET_TYPES = ["", "user", "tag", "alert_rule", "note"];

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [targetType, setTargetType] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useAuditLog({
    target_type: targetType || undefined,
    action: actionFilter || undefined,
    page,
    page_size: 50,
  });

  const totalPages = data ? Math.ceil(data.total / 50) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={targetType}
          onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200"
        >
          <option value="">All Types</option>
          {TARGET_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-500">Loading...</div>
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No audit log entries yet. Actions will be recorded as you manage users, tags, and settings.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[entry.action] ?? "bg-gray-800 text-gray-300"}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{entry.target_type}</span>
                      {entry.target_label && (
                        entry.target_type === "user" && entry.target_id ? (
                          <Link
                            to={`/users/${entry.target_id}`}
                            className="ml-2 text-brand-400 hover:text-brand-300"
                          >
                            {entry.target_label}
                          </Link>
                        ) : (
                          <span className="ml-2 text-gray-300">{entry.target_label}</span>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {entry.details ? (
                        <span className="font-mono">
                          {Object.entries(entry.details).map(([k, v]) => (
                            <span key={k} className="mr-3">
                              <span className="text-gray-600">{k}:</span> {String(v).slice(0, 50)}
                            </span>
                          ))}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages} ({data.total} entries)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
