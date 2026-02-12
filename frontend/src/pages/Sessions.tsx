import { useState, useMemo } from "react";
import { useSessionHistory, useSessionStats } from "../hooks/useSessions";
import { useServers } from "../hooks/useServers";
import { getExportUrl } from "../api/sessions";
import type { SessionHistoryFilters } from "../api/sessions";
import StatCard from "../components/common/StatCard";

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatWatchTime(sec: number): string {
  if (!sec) return "0m";
  const days = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getDisplayTitle(h: {
  grandparent_title?: string;
  season_number?: number;
  episode_number?: number;
  item_title?: string;
}): string {
  if (h.grandparent_title) {
    const s = h.season_number != null ? String(h.season_number).padStart(2, "0") : "??";
    const e = h.episode_number != null ? String(h.episode_number).padStart(2, "0") : "??";
    return `${h.grandparent_title} - S${s}E${e} - ${h.item_title || ""}`;
  }
  return h.item_title || "Unknown";
}

export default function Sessions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [serverId, setServerId] = useState("");
  const [itemType, setItemType] = useState("");
  const [completedOnly, setCompletedOnly] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: servers } = useServers();

  const filters: SessionHistoryFilters = useMemo(() => {
    const f: SessionHistoryFilters = { page, page_size: 25 };
    if (search) f.search = search;
    if (serverId) f.server_id = serverId;
    if (itemType) f.item_type = itemType;
    if (completedOnly) f.completed_only = true;
    if (startDate) f.start_date = startDate;
    if (endDate) f.end_date = endDate;
    return f;
  }, [page, search, serverId, itemType, completedOnly, startDate, endDate]);

  const statsFilters = useMemo(() => {
    const { page: _, page_size: __, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data, isLoading } = useSessionHistory(filters);
  const { data: stats } = useSessionStats(statsFilters);

  function resetFilters() {
    setSearch("");
    setServerId("");
    setItemType("");
    setCompletedOnly(false);
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  const hasFilters = search || serverId || itemType || completedOnly || startDate || endDate;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Session History</h1>
        <a
          href={getExportUrl(statsFilters)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          Export CSV
        </a>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Total Sessions" value={stats.total_sessions} />
          <StatCard
            label="Completed"
            value={stats.completed_sessions}
            sublabel={
              stats.total_sessions > 0
                ? `${Math.round((stats.completed_sessions / stats.total_sessions) * 100)}%`
                : "0%"
            }
          />
          <StatCard label="Watch Time" value={formatWatchTime(stats.total_watch_time_sec)} />
          <StatCard label="Avg Watched" value={`${Math.round(stats.avg_watched_pct)}%`} />
          <StatCard label="Unique Users" value={stats.unique_users} />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs text-gray-500">Search</label>
            <input
              type="text"
              placeholder="User, title, series..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Server</label>
            <select
              value={serverId}
              onChange={(e) => { setServerId(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Servers</option>
              {servers?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Type</label>
            <select
              value={itemType}
              onChange={(e) => { setItemType(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="Movie">Movies</option>
              <option value="Episode">Episodes</option>
              <option value="Audio">Music</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={completedOnly}
                onChange={(e) => { setCompletedOnly(e.target.checked); setPage(1); }}
                className="rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500"
              />
              Completed only
            </label>
          </div>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-10 text-center text-gray-500">Loading...</div>
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          {hasFilters ? "No sessions match your filters." : "No session history yet."}
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
                  <th className="px-4 py-3 font-medium">Platform</th>
                  <th className="px-4 py-3 font-medium">IP Address</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Watched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.items.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-900/50">
                    <td className="max-w-[300px] truncate px-4 py-3 font-medium" title={getDisplayTitle(h)}>
                      {getDisplayTitle(h)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{h.username}</td>
                    <td className="px-4 py-3 text-gray-400">{h.server_name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <span title={h.client_name || ""}>{h.device_name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{h.ip_address || "N/A"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(h.started_at).toLocaleString(undefined, {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDuration(h.play_duration_sec)}</td>
                    <td className="px-4 py-3">
                      <span className={h.completed ? "text-green-400" : "text-yellow-400"}>
                        {Math.round(h.watched_pct)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(data.page - 1) * data.page_size + 1}&ndash;
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
