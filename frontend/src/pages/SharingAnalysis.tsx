import { useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../components/common/StatCard";
import { useSharingDetail, useSharingOverview, useTriggerAnalysis } from "../hooks/useSharing";
import type { SharingScore } from "../types/sharing";

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
        <div className="rounded-lg border border-gray-800 p-3 text-center">
          <p className="text-2xl font-bold">{Math.round(data.overall_score)}</p>
          <p className="text-xs text-gray-500">Overall</p>
        </div>
        <div className="rounded-lg border border-gray-800 p-3 text-center">
          <p className="text-lg font-semibold">{Math.round(data.ip_diversity_score)}</p>
          <p className="text-xs text-gray-500">IP</p>
        </div>
        <div className="rounded-lg border border-gray-800 p-3 text-center">
          <p className="text-lg font-semibold">{Math.round(data.concurrency_score)}</p>
          <p className="text-xs text-gray-500">Concurrent</p>
        </div>
        <div className="rounded-lg border border-gray-800 p-3 text-center">
          <p className="text-lg font-semibold">{Math.round(data.pattern_score)}</p>
          <p className="text-xs text-gray-500">Pattern</p>
        </div>
        <div className="rounded-lg border border-gray-800 p-3 text-center">
          <p className="text-lg font-semibold">{Math.round(data.device_score)}</p>
          <p className="text-xs text-gray-500">Device</p>
        </div>
        <div className="rounded-lg border border-gray-800 p-3 text-center">
          <p className="text-lg font-semibold">{Math.round(data.cross_server_score)}</p>
          <p className="text-xs text-gray-500">Cross-Server</p>
        </div>
      </div>

      {/* Evidence summary */}
      {evidence.ip && (
        <div className="text-sm">
          <p className="font-medium text-gray-300">IP Analysis</p>
          <p className="text-gray-500">
            {(evidence.ip as Record<string, unknown>).unique_ips} unique IPs,{" "}
            {(evidence.ip as Record<string, unknown>).unique_countries} countries,{" "}
            max distance: {(evidence.ip as Record<string, unknown>).max_distance_km}km
          </p>
        </div>
      )}
      {evidence.concurrency && (
        <div className="text-sm">
          <p className="font-medium text-gray-300">Concurrency</p>
          <p className="text-gray-500">
            {(evidence.concurrency as Record<string, unknown>).overlapping_events} overlapping events,{" "}
            {(evidence.concurrency as Record<string, unknown>).different_ip_overlaps} from different IPs
          </p>
        </div>
      )}
      {evidence.device && (
        <div className="text-sm">
          <p className="font-medium text-gray-300">Devices</p>
          <p className="text-gray-500">
            {(evidence.device as Record<string, unknown>).device_count} devices,{" "}
            {(evidence.device as Record<string, unknown>).shared_device_count} shared with other users
          </p>
        </div>
      )}
      {evidence.cross_server && (
        <div className="text-sm">
          <p className="font-medium text-gray-300">Cross-Server</p>
          <p className="text-gray-500">
            {(evidence.cross_server as Record<string, unknown>).correlated_users} correlated users on other servers
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

export default function SharingAnalysis() {
  const { data, isLoading } = useSharingOverview();
  const triggerMut = useTriggerAnalysis();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

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

      {isLoading ? (
        <div className="py-10 text-center text-gray-500">Loading...</div>
      ) : !data || data.total_users_analyzed === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No sharing analysis data yet. Click "Run Analysis" to start.
        </p>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Critical" value={data.critical_count} />
            <StatCard label="High" value={data.high_count} />
            <StatCard label="Moderate" value={data.moderate_count} />
            <StatCard label="Low" value={data.low_count} />
          </div>

          {/* Detail panel */}
          {selectedUser && (
            <UserDetailPanel userId={selectedUser} onClose={() => setSelectedUser(null)} />
          )}

          {/* Scores table */}
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
        </>
      )}
    </div>
  );
}
