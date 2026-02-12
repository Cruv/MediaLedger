import { useState } from "react";
import { useAllServerHealth, useServerHealth } from "../hooks/useServerHealth";
import type { ServerHealthSummary } from "../types/serverHealth";

/* ─── Status Indicator ─── */
function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        online ? "bg-green-400" : "bg-red-500"
      }`}
    />
  );
}

/* ─── Server Card ─── */
function ServerCard({
  server,
  selected,
  onClick,
}: {
  server: ServerHealthSummary;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left transition-colors ${
        selected
          ? "border-brand-500 bg-brand-600/10"
          : "border-gray-800 bg-gray-900 hover:border-gray-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot online={server.is_online} />
          <span className="font-semibold">{server.name}</span>
        </div>
        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400 uppercase">
          {server.type}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Active: </span>
          <span className="text-white">{server.active_sessions}</span>
        </div>
        <div>
          <span className="text-gray-500">Transcode: </span>
          <span className="text-orange-400">{server.transcoding_sessions}</span>
        </div>
      </div>
      {server.version && (
        <p className="mt-1 text-xs text-gray-600">v{server.version}</p>
      )}
    </button>
  );
}

/* ─── Detail Panel ─── */
function ServerDetail({ serverId }: { serverId: string }) {
  const { data, isLoading } = useServerHealth(serverId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="p-6 text-center text-gray-500">Unable to load server details.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot online={data.is_online} />
          <h2 className="text-xl font-bold">{data.name}</h2>
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400 uppercase">
            {data.type}
          </span>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Active Sessions</p>
          <p className="text-2xl font-bold">{data.active_sessions}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Transcoding</p>
          <p className="text-2xl font-bold text-orange-400">{data.transcoding_now}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Direct Play</p>
          <p className="text-2xl font-bold text-green-400">{data.direct_play_now}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500">Est. Bandwidth</p>
          <p className="text-2xl font-bold">{data.estimated_bandwidth_mbps} Mbps</p>
        </div>
      </div>

      {/* Last 24h */}
      {data.last_24h && (
        <div className="rounded-lg border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 px-4 py-3">
            <h3 className="text-sm font-semibold">Last 24 Hours</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4">
            <div>
              <p className="text-xs text-gray-500">Sessions</p>
              <p className="text-lg font-bold">{data.last_24h.sessions}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Watch Hours</p>
              <p className="text-lg font-bold">{data.last_24h.watch_hours}h</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Transcoded</p>
              <p className="text-lg font-bold text-orange-400">
                {data.last_24h.transcode_sessions}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* System Info */}
      {data.system_info && (
        <div className="rounded-lg border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 px-4 py-3">
            <h3 className="text-sm font-semibold">System Information</h3>
          </div>
          <div className="grid grid-cols-1 gap-y-2 p-4 text-sm sm:grid-cols-2">
            {data.system_info.server_name && (
              <InfoRow label="Server Name" value={data.system_info.server_name} />
            )}
            {data.system_info.version && (
              <InfoRow label="Version" value={data.system_info.version} />
            )}
            {data.system_info.os && (
              <InfoRow label="OS" value={data.system_info.os} />
            )}
            {data.system_info.architecture && (
              <InfoRow label="Architecture" value={data.system_info.architecture} />
            )}
            {data.system_info.local_address && (
              <InfoRow label="Local Address" value={data.system_info.local_address} />
            )}
            {data.system_info.wan_address && (
              <InfoRow label="WAN Address" value={data.system_info.wan_address} />
            )}
            <InfoRow
              label="Pending Restart"
              value={data.system_info.has_pending_restart ? "Yes" : "No"}
              highlight={data.system_info.has_pending_restart}
            />
            <InfoRow
              label="Can Self-Restart"
              value={data.system_info.can_self_restart ? "Yes" : "No"}
            />
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="text-xs text-gray-600">
        Last seen:{" "}
        {data.last_seen
          ? new Date(data.last_seen).toLocaleString()
          : "Never"}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500">{label}:</span>
      <span className={highlight ? "text-yellow-400 font-medium" : "text-gray-300"}>
        {value}
      </span>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ServerHealth() {
  const { data: servers, isLoading } = useAllServerHealth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Server Health</h1>
        <p className="mt-1 text-sm text-gray-500">
          Live monitoring of transcode load, bandwidth estimates, and system status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Server list */}
        <div className="space-y-3 lg:col-span-1">
          {servers && servers.length > 0 ? (
            servers.map((s) => (
              <ServerCard
                key={s.server_id}
                server={s}
                selected={selectedId === s.server_id}
                onClick={() => setSelectedId(s.server_id)}
              />
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">
              No servers configured.
            </p>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedId ? (
            <ServerDetail serverId={selectedId} />
          ) : (
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
              <p className="text-gray-500">
                Select a server to view detailed health information.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
