import { useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../components/common/StatCard";
import {
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

      {!!evidence.ip && (
        <div className="text-sm">
          <p className="font-medium text-gray-300">IP Analysis</p>
          <p className="text-gray-500">
            {String((evidence.ip as Record<string, unknown>).unique_ips)} unique IPs,{" "}
            {String((evidence.ip as Record<string, unknown>).unique_countries)} countries,{" "}
            max distance: {String((evidence.ip as Record<string, unknown>).max_distance_km)}km
          </p>
        </div>
      )}
      {!!evidence.concurrency && (
        <div className="text-sm">
          <p className="font-medium text-gray-300">Concurrency</p>
          <p className="text-gray-500">
            {String((evidence.concurrency as Record<string, unknown>).overlapping_events)} overlapping events,{" "}
            {String((evidence.concurrency as Record<string, unknown>).different_ip_overlaps)} from different IPs
          </p>
        </div>
      )}
      {!!evidence.device && (
        <div className="text-sm">
          <p className="font-medium text-gray-300">Devices</p>
          <p className="text-gray-500">
            {String((evidence.device as Record<string, unknown>).device_count)} devices,{" "}
            {String((evidence.device as Record<string, unknown>).shared_device_count)} shared with other users
          </p>
        </div>
      )}
      {!!evidence.cross_server && (
        <div className="text-sm">
          <p className="font-medium text-gray-300">Cross-Server</p>
          <p className="text-gray-500">
            {String((evidence.cross_server as Record<string, unknown>).correlated_users)} correlated users on other servers
          </p>
        </div>
      )}

      <p className="text-xs text-gray-600">
        Analyzed: {new Date(data.analysis_window_start).toLocaleDateString()} –{" "}
        {new Date(data.analysis_window_end).toLocaleDateString()}
        {" · "}Computed: {new Date(data.computed_at).toLocaleString()}
      </p>
    </div>
  );
}

/* ─── Tab: Overview ─── */
function OverviewTab() {
  const { data, isLoading } = useSharingOverview();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

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

      {selectedUser && <UserDetailPanel userId={selectedUser} onClose={() => setSelectedUser(null)} />}

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Server</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Concurrent</th>
              <th className="px-4 py-3 font-medium">Pattern</th>
              <th className="px-4 py-3 font-medium">Device</th>
              <th className="px-4 py-3 font-medium">Cross-Server</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.scores.map((s) => (
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
function CorrelationsTab() {
  const { data, isLoading } = useCorrelations();
  const confirmMut = useConfirmCorrelation();
  const dismissMut = useDismissCorrelation();

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
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
          <tr>
            <th className="px-4 py-3 font-medium">User A</th>
            <th className="px-4 py-3 font-medium">User B</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Confidence</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {data.map((c) => (
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
  );
}

/* ─── Tab: IP Analysis ─── */
function IPAnalysisTab() {
  const { data, isLoading } = useIPOverlaps();

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" /></div>;
  if (!data || data.length === 0)
    return (
      <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
        No IP overlaps detected between users.
      </p>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Users sharing one or more IP addresses, sorted by overlap count.</p>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">User A</th>
              <th className="px-4 py-3 font-medium">User B</th>
              <th className="px-4 py-3 font-medium">Shared IPs</th>
              <th className="px-4 py-3 font-medium">Countries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.map((o, i) => (
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
function ConcurrentTab() {
  const { data, isLoading } = useConcurrentEvents();

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" /></div>;
  if (!data || data.length === 0)
    return (
      <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
        No concurrent stream events detected.
      </p>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Instances where a user streamed from multiple locations simultaneously.</p>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Overlap Start</th>
              <th className="px-4 py-3 font-medium">Overlap End</th>
              <th className="px-4 py-3 font-medium">IP A</th>
              <th className="px-4 py-3 font-medium">IP B</th>
              <th className="px-4 py-3 font-medium">Device A</th>
              <th className="px-4 py-3 font-medium">Device B</th>
              <th className="px-4 py-3 font-medium">Distance</th>
              <th className="px-4 py-3 font-medium">Same Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.map((e) => (
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
  const triggerMut = useTriggerAnalysis();
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sharing Analysis</h1>
        <button
          onClick={() => triggerMut.mutate()}
          disabled={triggerMut.isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
        >
          {triggerMut.isPending ? "Analyzing..." : "Run Analysis"}
        </button>
      </div>

      {triggerMut.data && (
        <div className="rounded-lg border border-green-900 bg-green-950/50 p-3 text-sm text-green-400">
          {triggerMut.data.message}
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
