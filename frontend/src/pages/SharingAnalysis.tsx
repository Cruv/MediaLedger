import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import StatCard from "../components/common/StatCard";
import SortableHeader from "../components/common/SortableHeader";
import { useTableSort } from "../hooks/useTableSort";
import {
  useAnalysisStatus,
  useConfirmCorrelation,
  useCorrelations,
  useConcurrentEvents,
  useDismissCorrelation,
  useIPOverlaps,
  useSharingDetail,
  useSharingOverview,
  useTriggerAnalysis,
} from "../hooks/useSharing";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-900/40 text-red-400",
  high: "bg-orange-900/40 text-orange-400",
  moderate: "bg-yellow-900/40 text-yellow-400",
  low: "bg-green-900/40 text-green-400",
};

const SCORE_BAR_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  moderate: "bg-yellow-500",
  low: "bg-green-500",
};

const SEVERITY_ORDER: Record<string, number> = { critical: 4, high: 3, moderate: 2, low: 1 };

const TABS = ["Overview", "Correlations", "IP Analysis", "Concurrent Streams"] as const;
type Tab = (typeof TABS)[number];

function ScoreBar({ score, severity }: { score: number; severity: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full ${SCORE_BAR_COLORS[severity] ?? "bg-gray-500"}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{Math.round(score)}</span>
    </div>
  );
}

function UserDetailPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading } = useSharingDetail(userId);

  if (isLoading) return <div className="py-4 text-center text-gray-500">Loading details...</div>;
  if (!data) return null;

  const evidence = data.evidence ?? {};

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          <Link to={`/users/${data.user_id}`} className="text-brand-400 hover:text-brand-300">
            {data.username}
          </Link>
          <span className="ml-2 text-sm text-gray-500">{data.server_name}</span>
        </h3>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-300">Close</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Overall", val: data.overall_score, big: true },
          { label: "IP", val: data.ip_diversity_score },
          { label: "Concurrent", val: data.concurrency_score },
          { label: "Pattern", val: data.pattern_score },
          { label: "Device", val: data.device_score },
          { label: "Cross-Server", val: data.cross_server_score },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-800 p-3 text-center">
            <p className={s.big ? "text-2xl font-bold" : "text-lg font-semibold"}>{Math.round(s.val)}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {!!evidence.ip && (() => {
        const ip = evidence.ip as Record<string, unknown>;
        const topIps = (ip.top_ips as Array<{ ip: string; city: string | null; hits: number }>) ?? [];
        return (
          <div className="text-sm space-y-2">
            <p className="font-medium text-gray-300">IP Analysis</p>
            <p className="text-gray-500">
              {String(ip.unique_ips)} unique IPs · {String(ip.unique_countries)} countries · {String(ip.unique_cities)} cities
              {Number(ip.max_distance_km) > 0 && <> · max distance: {String(ip.max_distance_km)}km</>}
              {Number(ip.vpn_count) > 0 && <> · <span className="text-yellow-400">{String(ip.vpn_count)} VPN</span></>}
            </p>
            {topIps.length > 0 && (
              <div className="rounded border border-gray-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800/50 text-gray-500">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">IP Address</th>
                      <th className="px-3 py-1.5 text-left font-medium">Location</th>
                      <th className="px-3 py-1.5 text-right font-medium">Hits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {topIps.map((entry) => (
                      <tr key={entry.ip}>
                        <td className="px-3 py-1.5 font-mono text-gray-300">{entry.ip}</td>
                        <td className="px-3 py-1.5 text-gray-400">{entry.city ?? "—"}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400">{entry.hits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {!!evidence.concurrency && (() => {
        const conc = evidence.concurrency as Record<string, unknown>;
        const overlaps = (conc.recent_overlaps as Array<{
          ip_a: string | null; ip_b: string | null;
          device_a: string | null; device_b: string | null;
          overlap_seconds: number; same_ip: boolean;
        }>) ?? [];
        return (
          <div className="text-sm space-y-2">
            <p className="font-medium text-gray-300">Concurrency</p>
            <p className="text-gray-500">
              {String(conc.overlapping_events)} overlapping events · {String(conc.different_ip_overlaps)} from different IPs
              {Number(conc.max_overlap_seconds) > 0 && <> · longest: {Math.round(Number(conc.max_overlap_seconds) / 60)}min</>}
            </p>
            {overlaps.length > 0 && overlaps.some((o) => !o.same_ip) && (
              <div className="rounded border border-gray-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800/50 text-gray-500">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">IP A</th>
                      <th className="px-3 py-1.5 text-left font-medium">IP B</th>
                      <th className="px-3 py-1.5 text-left font-medium">Device A</th>
                      <th className="px-3 py-1.5 text-left font-medium">Device B</th>
                      <th className="px-3 py-1.5 text-right font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {overlaps.filter((o) => !o.same_ip).slice(0, 5).map((o, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 font-mono text-gray-300">{o.ip_a ?? "—"}</td>
                        <td className="px-3 py-1.5 font-mono text-gray-300">{o.ip_b ?? "—"}</td>
                        <td className="px-3 py-1.5 text-gray-400 truncate max-w-[120px]">{o.device_a ?? "—"}</td>
                        <td className="px-3 py-1.5 text-gray-400 truncate max-w-[120px]">{o.device_b ?? "—"}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400">{Math.round(o.overlap_seconds / 60)}min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {!!evidence.device && (() => {
        const dev = evidence.device as Record<string, unknown>;
        const devices = (dev.devices as Array<{
          device_name: string | null; client_name: string | null; session_count: number;
        }>) ?? [];
        return (
          <div className="text-sm space-y-2">
            <p className="font-medium text-gray-300">Devices</p>
            <p className="text-gray-500">
              {String(dev.device_count)} devices · {String(dev.shared_device_count)} shared with other users
            </p>
            {devices.length > 0 && (
              <div className="rounded border border-gray-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800/50 text-gray-500">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">Device</th>
                      <th className="px-3 py-1.5 text-left font-medium">Client</th>
                      <th className="px-3 py-1.5 text-right font-medium">Sessions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {devices.map((d, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-gray-300">{d.device_name ?? "Unknown"}</td>
                        <td className="px-3 py-1.5 text-gray-400">{d.client_name ?? "—"}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400">{d.session_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {!!evidence.cross_server && (() => {
        const cross = evidence.cross_server as Record<string, unknown>;
        const correlations = (cross.correlations as Array<{
          other_username: string; type: string; shared_count: number;
        }>) ?? [];
        return (
          <div className="text-sm space-y-2">
            <p className="font-medium text-gray-300">Cross-Server</p>
            <p className="text-gray-500">
              {String(cross.correlated_users)} correlated users
              {Number(cross.ip_correlations) > 0 && <> · {String(cross.ip_correlations)} IP matches</>}
              {Number(cross.device_correlations) > 0 && <> · {String(cross.device_correlations)} device matches</>}
              {Number(cross.name_matches) > 0 && <> · {String(cross.name_matches)} username matches</>}
            </p>
            {correlations.length > 0 && (
              <div className="rounded border border-gray-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800/50 text-gray-500">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">User</th>
                      <th className="px-3 py-1.5 text-left font-medium">Match Type</th>
                      <th className="px-3 py-1.5 text-right font-medium">Shared</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {correlations.map((c, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-brand-400">{c.other_username}</td>
                        <td className="px-3 py-1.5 text-gray-400">{c.type.replace("_", " ")}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400">{c.shared_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      <p className="text-xs text-gray-600">
        Analyzed: {new Date(data.analysis_window_start).toLocaleDateString()} –{" "}
        {new Date(data.analysis_window_end).toLocaleDateString()}
        {" · "}Computed: {new Date(data.computed_at).toLocaleString()}
      </p>
    </div>
  );
}

/* ─── Tab: Overview ─── */
type OverviewSortKey = "username" | "server_name" | "overall_score" | "severity" | "ip_diversity_score" | "concurrency_score" | "pattern_score" | "device_score" | "cross_server_score";

function OverviewTab() {
  const { data, isLoading } = useSharingOverview();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.scores;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.username.toLowerCase().includes(q) || s.server_name.toLowerCase().includes(q));
    }
    if (severityFilter) {
      list = list.filter((s) => s.severity === severityFilter);
    }
    return list;
  }, [data, search, severityFilter]);

  const { sort, toggleSort, sorted } = useTableSort<(typeof filtered)[number], OverviewSortKey>(
    filtered,
    "overall_score",
    "desc",
    (a, b, key, dir) => {
      let cmp = 0;
      if (key === "severity") {
        cmp = (SEVERITY_ORDER[a.severity] ?? 0) - (SEVERITY_ORDER[b.severity] ?? 0);
      } else {
        const aVal = a[key];
        const bVal = b[key];
        if (typeof aVal === "number" && typeof bVal === "number") cmp = aVal - bVal;
        else cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: "base" });
      }
      return dir === "asc" ? cmp : -cmp;
    },
  );

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" /></div>;
  if (!data || data.total_users_analyzed === 0)
    return (
      <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
        No sharing analysis data yet. Click &quot;Run Analysis&quot; to start.
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total Analyzed" value={data.total_users_analyzed} />
        <StatCard label="Critical" value={data.critical_count} />
        <StatCard label="High" value={data.high_count} />
        <StatCard label="Moderate" value={data.moderate_count} />
        <StatCard label="Low" value={data.low_count} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search users or servers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="moderate">Moderate</option>
          <option value="low">Low</option>
        </select>
        {(search || severityFilter) && (
          <button
            onClick={() => { setSearch(""); setSeverityFilter(""); }}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            Clear
          </button>
        )}
        <span className="text-xs text-gray-500">{sorted.length} users</span>
      </div>

      {selectedUser && <UserDetailPanel userId={selectedUser} onClose={() => setSelectedUser(null)} />}

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <SortableHeader label="User" sortKey="username" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Server" sortKey="server_name" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Score" sortKey="overall_score" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Severity" sortKey="severity" sort={sort} onSort={toggleSort} />
              <SortableHeader label="IP" sortKey="ip_diversity_score" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Concurrent" sortKey="concurrency_score" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Pattern" sortKey="pattern_score" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Device" sortKey="device_score" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Cross-Server" sortKey="cross_server_score" sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((s) => (
              <tr
                key={s.user_id}
                className="cursor-pointer hover:bg-gray-900/50"
                onClick={() => setSelectedUser(s.user_id === selectedUser ? null : s.user_id)}
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-brand-400">{s.username}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">{s.server_name}</td>
                <td className="px-4 py-3 font-bold">{Math.round(s.overall_score)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[s.severity]}`}>
                    {s.severity}
                  </span>
                </td>
                <td className="px-4 py-3"><ScoreBar score={s.ip_diversity_score} severity={s.severity} /></td>
                <td className="px-4 py-3"><ScoreBar score={s.concurrency_score} severity={s.severity} /></td>
                <td className="px-4 py-3"><ScoreBar score={s.pattern_score} severity={s.severity} /></td>
                <td className="px-4 py-3"><ScoreBar score={s.device_score} severity={s.severity} /></td>
                <td className="px-4 py-3"><ScoreBar score={s.cross_server_score} severity={s.severity} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Correlations ─── */
type CorrSortKey = "user_a_username" | "user_b_username" | "correlation_type" | "confidence_score";

function CorrelationsTab() {
  const { data, isLoading } = useCorrelations();
  const confirmMut = useConfirmCorrelation();
  const dismissMut = useDismissCorrelation();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (c) =>
        c.user_a_username.toLowerCase().includes(q) ||
        c.user_b_username.toLowerCase().includes(q) ||
        c.correlation_type.toLowerCase().includes(q),
    );
  }, [data, search]);

  const { sort, toggleSort, sorted } = useTableSort<(typeof filtered)[number], CorrSortKey>(
    filtered,
    "confidence_score",
    "desc",
  );

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" /></div>;
  if (!data || data.length === 0)
    return (
      <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
        No user correlations found. Run analysis to detect linked accounts.
      </p>
    );

  const TYPE_COLORS: Record<string, string> = {
    ip_match: "bg-blue-900/40 text-blue-400",
    username_match: "bg-purple-900/40 text-purple-400",
    algorithm: "bg-cyan-900/40 text-cyan-400",
    manual: "bg-gray-800 text-gray-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search users or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            Clear
          </button>
        )}
        <span className="text-xs text-gray-500">{sorted.length} correlations</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <SortableHeader label="User A" sortKey="user_a_username" sort={sort} onSort={toggleSort} />
              <SortableHeader label="User B" sortKey="user_b_username" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Type" sortKey="correlation_type" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Confidence" sortKey="confidence_score" sort={sort} onSort={toggleSort} />
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((c) => (
              <tr key={c.id} className="hover:bg-gray-900/50">
                <td className="px-4 py-3">
                  <span className="font-medium text-brand-400">{c.user_a_username}</span>
                  <span className="ml-1 text-xs text-gray-500">{c.user_a_server}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-brand-400">{c.user_b_username}</span>
                  <span className="ml-1 text-xs text-gray-500">{c.user_b_server}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[c.correlation_type] ?? "bg-gray-800 text-gray-300"}`}>
                    {c.correlation_type.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.min(c.confidence_score * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{Math.round(c.confidence_score * 100)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.confirmed_by_admin ? (
                    <span className="rounded bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">Confirmed</span>
                  ) : (
                    <span className="rounded bg-yellow-900/40 px-2 py-0.5 text-xs font-medium text-yellow-400">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {!c.confirmed_by_admin && (
                      <button
                        onClick={() => confirmMut.mutate(c.id)}
                        disabled={confirmMut.isPending}
                        className="rounded bg-green-800 px-2 py-1 text-xs text-green-300 hover:bg-green-700"
                      >
                        Confirm
                      </button>
                    )}
                    <button
                      onClick={() => dismissMut.mutate(c.id)}
                      disabled={dismissMut.isPending}
                      className="rounded bg-red-900 px-2 py-1 text-xs text-red-300 hover:bg-red-800"
                    >
                      Dismiss
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: IP Analysis ─── */
type IPSortKey = "user_a_username" | "user_b_username" | "shared_ips";

function IPAnalysisTab() {
  const { data, isLoading } = useIPOverlaps();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (o) => o.user_a_username.toLowerCase().includes(q) || o.user_b_username.toLowerCase().includes(q),
    );
  }, [data, search]);

  const { sort, toggleSort, sorted } = useTableSort<(typeof filtered)[number], IPSortKey>(
    filtered,
    "shared_ips",
    "desc",
  );

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" /></div>;
  if (!data || data.length === 0)
    return (
      <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
        No IP overlaps detected between users.
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-400">Users sharing one or more IP addresses.</p>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <SortableHeader label="User A" sortKey="user_a_username" sort={sort} onSort={toggleSort} />
              <SortableHeader label="User B" sortKey="user_b_username" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Shared IPs" sortKey="shared_ips" sort={sort} onSort={toggleSort} />
              <th className="px-4 py-3 font-medium">Countries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((o, i) => (
              <tr key={i} className="hover:bg-gray-900/50">
                <td className="px-4 py-3 font-medium text-brand-400">{o.user_a_username}</td>
                <td className="px-4 py-3 font-medium text-brand-400">{o.user_b_username}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                    o.shared_ips >= 5 ? "bg-red-900/40 text-red-400" :
                    o.shared_ips >= 3 ? "bg-orange-900/40 text-orange-400" :
                    "bg-gray-800 text-gray-300"
                  }`}>
                    {o.shared_ips}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {o.shared_countries.length > 0 ? o.shared_countries.join(", ") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Concurrent Streams ─── */
type ConcSortKey = "username" | "overlap_start" | "geo_distance_km" | "same_network";

function ConcurrentTab() {
  const { data, isLoading } = useConcurrentEvents();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((e) => e.username.toLowerCase().includes(q));
  }, [data, search]);

  const { sort, toggleSort, sorted } = useTableSort<(typeof filtered)[number], ConcSortKey>(
    filtered,
    "overlap_start",
    "desc",
  );

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" /></div>;
  if (!data || data.length === 0)
    return (
      <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
        No concurrent stream events detected.
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-400">Instances where a user streamed from multiple locations simultaneously.</p>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <SortableHeader label="User" sortKey="username" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Overlap Start" sortKey="overlap_start" sort={sort} onSort={toggleSort} />
              <th className="px-4 py-3 font-medium">Overlap End</th>
              <th className="px-4 py-3 font-medium">IP A</th>
              <th className="px-4 py-3 font-medium">IP B</th>
              <th className="px-4 py-3 font-medium">Device A</th>
              <th className="px-4 py-3 font-medium">Device B</th>
              <SortableHeader label="Distance" sortKey="geo_distance_km" sort={sort} onSort={toggleSort} />
              <SortableHeader label="Same Net" sortKey="same_network" sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((e) => (
              <tr key={e.id} className="hover:bg-gray-900/50">
                <td className="px-4 py-3 font-medium text-brand-400">{e.username}</td>
                <td className="px-4 py-3 text-gray-300">{new Date(e.overlap_start).toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300">{new Date(e.overlap_end).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{e.ip_a ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{e.ip_b ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{e.device_a ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{e.device_b ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400">
                  {e.geo_distance_km != null ? `${Math.round(e.geo_distance_km)} km` : "—"}
                </td>
                <td className="px-4 py-3">
                  {e.same_network ? (
                    <span className="rounded bg-green-900/40 px-2 py-0.5 text-xs text-green-400">Yes</span>
                  ) : (
                    <span className="rounded bg-red-900/40 px-2 py-0.5 text-xs text-red-400">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SharingAnalysis() {
  const qc = useQueryClient();
  const triggerMut = useTriggerAnalysis();
  const [tab, setTab] = useState<Tab>("Overview");
  const [polling, setPolling] = useState(false);
  const [completionMsg, setCompletionMsg] = useState<string | null>(null);

  const { data: statusData } = useAnalysisStatus(polling);

  // When polling detects completion, refresh all queries and show result
  useEffect(() => {
    if (polling && statusData && !statusData.running && statusData.message) {
      setPolling(false);
      setCompletionMsg(statusData.message);
      qc.invalidateQueries({ queryKey: ["sharing-overview"] });
      qc.invalidateQueries({ queryKey: ["sharing-correlations"] });
      qc.invalidateQueries({ queryKey: ["sharing-ip-overlaps"] });
      qc.invalidateQueries({ queryKey: ["sharing-concurrent-events"] });
    }
  }, [polling, statusData, qc]);

  const handleRunAnalysis = () => {
    setCompletionMsg(null);
    triggerMut.mutate(undefined, {
      onSuccess: () => setPolling(true),
    });
  };

  const isRunning = triggerMut.isPending || polling;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sharing Analysis</h1>
        <button
          onClick={handleRunAnalysis}
          disabled={isRunning}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
        >
          {isRunning ? "Analyzing..." : "Run Analysis"}
        </button>
      </div>

      {isRunning && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-900 bg-blue-950/50 p-3 text-sm text-blue-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          Analysis in progress — this may take a minute...
        </div>
      )}

      {!isRunning && completionMsg && (
        <div className="rounded-lg border border-green-900 bg-green-950/50 p-3 text-sm text-green-400">
          {completionMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-800 bg-gray-900 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-brand-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab />}
      {tab === "Correlations" && <CorrelationsTab />}
      {tab === "IP Analysis" && <IPAnalysisTab />}
      {tab === "Concurrent Streams" && <ConcurrentTab />}
    </div>
  );
}
