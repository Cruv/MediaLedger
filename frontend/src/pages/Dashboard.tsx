import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDashboard } from "../hooks/useDashboard";
import StatCard from "../components/common/StatCard";
import type { ActiveSession } from "../types/session";
import type { ServerStatus } from "../types/dashboard";

function formatDuration(ticks: number, totalTicks?: number): string {
  if (!totalTicks || totalTicks === 0) return "--:--";
  const pct = Math.round((ticks / totalTicks) * 100);
  const totalSec = Math.floor(totalTicks / 10_000_000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const duration = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
  return `${pct}% of ${duration}`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatWatchTime(sec: number): string {
  if (!sec) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getDisplayTitle(session: ActiveSession): string {
  if (session.series_name) {
    const s = session.season_number != null ? String(session.season_number).padStart(2, "0") : "??";
    const e = session.episode_number != null ? String(session.episode_number).padStart(2, "0") : "??";
    return `${session.series_name} - S${s}E${e} - ${session.item_title || ""}`;
  }
  return session.item_title || "Unknown";
}

function StreamCard({ session }: { session: ActiveSession }) {
  const progress =
    session.runtime_ticks && session.runtime_ticks > 0
      ? (session.position_ticks / session.runtime_ticks) * 100
      : 0;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" title={getDisplayTitle(session)}>
            {getDisplayTitle(session)}
          </p>
          <p className="text-sm text-gray-400">
            {session.username} &middot; {session.server_name}
          </p>
        </div>
        <span
          className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            session.state === "playing"
              ? "bg-green-900/50 text-green-400"
              : "bg-yellow-900/50 text-yellow-400"
          }`}
        >
          {session.state}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>{formatDuration(session.position_ticks, session.runtime_ticks)}</span>
          <span>
            {session.device_name}
            {session.play_method ? ` (${session.play_method})` : ""}
          </span>
        </div>
        {session.ip_address && (
          <p className="mt-0.5 text-xs text-gray-600">{session.ip_address}</p>
        )}
      </div>
    </div>
  );
}

function ServerStatusBadge({ status }: { status: ServerStatus }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          status.online ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{status.name}</p>
        <p className="text-xs text-gray-500">
          {status.server_type} &middot;{" "}
          {status.last_seen_at ? formatRelativeTime(status.last_seen_at) : "never"}
        </p>
      </div>
    </div>
  );
}

type SortField = "username" | "title" | "server" | "started";

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard();
  const [searchTerm, setSearchTerm] = useState("");
  const [serverFilter, setServerFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortField>("username");

  const filteredStreams = useMemo(() => {
    if (!data) return [];
    let filtered = data.active_streams;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.username?.toLowerCase().includes(term) ||
          s.item_title?.toLowerCase().includes(term) ||
          s.series_name?.toLowerCase().includes(term) ||
          s.ip_address?.includes(term),
      );
    }

    if (serverFilter !== "all") {
      filtered = filtered.filter((s) => s.server_name === serverFilter);
    }

    if (stateFilter !== "all") {
      filtered = filtered.filter((s) => s.state === stateFilter);
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "username":
          return (a.username || "").localeCompare(b.username || "");
        case "title":
          return getDisplayTitle(a).localeCompare(getDisplayTitle(b));
        case "server":
          return (a.server_name || "").localeCompare(b.server_name || "");
        case "started":
          return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
        default:
          return 0;
      }
    });
  }, [data, searchTerm, serverFilter, stateFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-900 bg-red-950/50 p-4 text-red-400">
        Failed to load dashboard: {(error as Error).message}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Streams" value={data.total_streams} />
        <StatCard
          label="Servers Online"
          value={data.server_statuses.filter((s) => s.online).length}
          sublabel={`of ${data.total_servers}`}
        />
        <StatCard
          label="Library Items"
          value={data.library_summary.total_items}
          sublabel={`${data.library_summary.total_libraries} libraries`}
        />
        <StatCard
          label="Watched"
          value={`${data.library_summary.total_items > 0 ? Math.round((data.library_summary.watched_items / data.library_summary.total_items) * 100) : 0}%`}
          sublabel={`${data.library_summary.watched_items} of ${data.library_summary.total_items}`}
        />
      </div>

      {/* Server statuses */}
      {data.server_statuses.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Servers</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.server_statuses.map((s) => (
              <ServerStatusBadge key={s.id} status={s} />
            ))}
          </div>
        </section>
      )}

      {/* Active streams */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Active Streams{" "}
          <span className="text-sm font-normal text-gray-500">
            ({filteredStreams.length}
            {filteredStreams.length !== data.active_streams.length
              ? ` of ${data.active_streams.length}`
              : ""}{" "}
            &middot; auto-refresh 5s)
          </span>
        </h2>

        {/* Filters */}
        {data.active_streams.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search users, shows, IPs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <select
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="all">All Servers</option>
              {data.server_statuses.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="all">All States</option>
              <option value="playing">Playing</option>
              <option value="paused">Paused</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="username">Sort: User</option>
              <option value="title">Sort: Title</option>
              <option value="server">Sort: Server</option>
              <option value="started">Sort: Recent</option>
            </select>
          </div>
        )}

        {filteredStreams.length === 0 ? (
          <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
            {data.active_streams.length === 0
              ? "No active streams"
              : "No streams match your filters"}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filteredStreams.map((s) => (
              <StreamCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </section>

      {/* Top users (7 day) */}
      {data.top_users_7d.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Top Users (7 days)</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Server</th>
                  <th className="px-4 py-3 font-medium">Plays</th>
                  <th className="px-4 py-3 font-medium">Watch Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.top_users_7d.map((u) => (
                  <tr key={u.user_id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/users/${u.user_id}`}
                        className="font-medium text-brand-400 hover:text-brand-300"
                      >
                        {u.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{u.server_name}</td>
                    <td className="px-4 py-3 text-gray-400">{u.play_count}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatWatchTime(u.total_watch_time_sec)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Request pipeline */}
      {data.request_summary.total > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            <Link to="/requests" className="hover:text-brand-400">
              Request Pipeline
            </Link>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Pending" value={data.request_summary.pending} />
            <StatCard label="Available" value={data.request_summary.available} />
            <StatCard label="Watched" value={data.request_summary.watched} />
            <StatCard
              label="Never Watched"
              value={data.request_summary.never_watched}
            />
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
        {data.recent_activity.length === 0 ? (
          <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
            No activity yet. Add a server and start watching!
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Server</th>
                  <th className="px-4 py-3 font-medium">Watched</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.recent_activity.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 font-medium">
                      {h.grandparent_title
                        ? `${h.grandparent_title} - S${h.season_number}E${h.episode_number}`
                        : h.item_title || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{h.username}</td>
                    <td className="px-4 py-3 text-gray-400">{h.server_name}</td>
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
                      {formatRelativeTime(h.stopped_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
