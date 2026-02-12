import { useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useGeoMapData, useGeoStats, useEnrichIPs } from "../hooks/useGeoIP";
import type { GeoPoint } from "../types/geoip";

/* ─── Cluster logic: group nearby points ─── */
function clusterPoints(points: GeoPoint[], precision = 2) {
  const buckets = new Map<
    string,
    { lat: number; lon: number; points: GeoPoint[] }
  >();

  for (const p of points) {
    const key = `${p.lat.toFixed(precision)},${p.lon.toFixed(precision)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.points.push(p);
    } else {
      buckets.set(key, { lat: p.lat, lon: p.lon, points: [p] });
    }
  }

  return Array.from(buckets.values());
}

/* ─── Stats Cards ─── */
function StatsCards() {
  const { data: stats } = useGeoStats();
  const enrichMutation = useEnrichIPs();

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
        <p className="text-xs text-gray-500">Geolocated IPs</p>
        <p className="text-xl font-bold text-white">{stats.geolocated_ips}</p>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
        <p className="text-xs text-gray-500">Pending Geo</p>
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-white">
            {stats.ungeolocated_ips}
          </p>
          {stats.ungeolocated_ips > 0 && (
            <button
              onClick={() => enrichMutation.mutate()}
              disabled={enrichMutation.isPending}
              className="rounded bg-brand-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {enrichMutation.isPending ? "..." : "Enrich"}
            </button>
          )}
        </div>
        {enrichMutation.isSuccess && enrichMutation.data && (
          <p className="mt-1 text-[10px] text-green-400">
            +{enrichMutation.data.enriched} enriched
          </p>
        )}
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
        <p className="text-xs text-gray-500">VPN Detected</p>
        <p className="text-xl font-bold text-orange-400">{stats.vpn_ips}</p>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
        <p className="text-xs text-gray-500">Users Mapped</p>
        <p className="text-xl font-bold text-white">{stats.users_with_geo}</p>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
        <p className="text-xs text-gray-500">Countries</p>
        <p className="text-xl font-bold text-white">
          {stats.countries.length}
        </p>
        <p className="mt-0.5 text-[10px] text-gray-500 truncate">
          {stats.countries
            .slice(0, 5)
            .map((c) => c.code)
            .join(", ")}
        </p>
      </div>
    </div>
  );
}

/* ─── Map Component ─── */
function GeoMapView({
  userId,
}: {
  userId?: string;
}) {
  const { data, isLoading } = useGeoMapData(userId);

  const clusters = useMemo(() => {
    if (!data?.points.length) return [];
    return clusterPoints(data.points);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg border border-gray-800 bg-gray-900">
        <div className="text-gray-500">Loading map data...</div>
      </div>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg border border-gray-800 bg-gray-900">
        <div className="text-center">
          <p className="text-gray-500">No geolocation data available yet.</p>
          <p className="mt-1 text-sm text-gray-600">
            IP addresses will be geolocated as sessions are recorded. Make sure
            you have the GeoLite2 database installed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800">
      <MapContainer
        center={[30, 0]}
        zoom={2}
        style={{ height: "500px", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {clusters.map((cluster, i) => {
          const userCount = new Set(cluster.points.map((p) => p.username)).size;
          const totalHits = cluster.points.reduce((s, p) => s + p.hits, 0);
          const hasVPN = cluster.points.some((p) => p.is_vpn);
          const radius = Math.min(Math.max(Math.sqrt(totalHits) * 2, 5), 30);

          const color = hasVPN
            ? "#f97316"
            : userCount > 1
              ? "#ef4444"
              : "#818cf8";

          return (
            <CircleMarker
              key={i}
              center={[cluster.lat, cluster.lon]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                color: color,
                weight: 1,
                fillOpacity: 0.6,
              }}
            >
              <Popup>
                <div className="text-sm" style={{ minWidth: 160 }}>
                  <p className="font-semibold text-gray-900 mb-1">
                    {cluster.points[0].city || "Unknown City"}
                    {cluster.points[0].region
                      ? `, ${cluster.points[0].region}`
                      : ""}
                  </p>
                  <p className="text-gray-600 text-xs mb-2">
                    {cluster.points[0].country || "??"}
                  </p>
                  <div className="space-y-0.5 text-xs text-gray-700">
                    <p>
                      <span className="font-medium">{userCount}</span> user
                      {userCount !== 1 ? "s" : ""} &middot;{" "}
                      <span className="font-medium">
                        {cluster.points.length}
                      </span>{" "}
                      IP{cluster.points.length !== 1 ? "s" : ""}
                    </p>
                    <p>
                      <span className="font-medium">{totalHits}</span> total
                      sessions
                    </p>
                    {hasVPN && (
                      <p className="text-orange-600 font-medium">
                        VPN detected
                      </p>
                    )}
                  </div>
                  {cluster.points.length <= 5 && (
                    <div className="mt-2 border-t pt-1 space-y-0.5">
                      {cluster.points.map((p, j) => (
                        <p key={j} className="text-xs text-gray-600">
                          {p.username} &middot; {p.ip} &middot; {p.hits} hits
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

/* ─── Country Table ─── */
function CountryTable() {
  const { data: stats } = useGeoStats();
  if (!stats || stats.countries.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 px-4 py-3">
        <h3 className="text-sm font-semibold">Connections by Country</h3>
      </div>
      <div className="divide-y divide-gray-800/50">
        {stats.countries.map((c) => (
          <div key={c.code} className="flex items-center justify-between px-4 py-2">
            <span className="text-sm text-gray-300">{c.code}</span>
            <span className="text-sm text-gray-500">{c.count} IPs</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function GeoMap() {
  const [selectedUser, setSelectedUser] = useState<string | undefined>(
    undefined
  );
  const { data } = useGeoMapData();

  // Unique users for filter dropdown
  const users = useMemo(() => {
    if (!data?.points) return [];
    const seen = new Map<string, string>();
    for (const p of data.points) {
      if (!seen.has(p.user_id)) {
        seen.set(p.user_id, p.username);
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GeoIP Map</h1>
          <p className="mt-1 text-sm text-gray-500">
            Visualize where your users are connecting from.
          </p>
        </div>
        <div>
          <select
            value={selectedUser || ""}
            onChange={(e) =>
              setSelectedUser(e.target.value || undefined)
            }
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <StatsCards />
      <GeoMapView userId={selectedUser} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CountryTable />
        {/* User IP list for selected user */}
        {selectedUser && <UserIPList userId={selectedUser} />}
      </div>
    </div>
  );
}

/* ─── User IP Detail List ─── */
function UserIPList({ userId }: { userId: string }) {
  const { data } = useGeoMapData(userId);

  if (!data || data.points.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 px-4 py-3">
        <h3 className="text-sm font-semibold">
          IPs for {data.points[0]?.username}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
              <th className="px-4 py-2 font-medium">IP Address</th>
              <th className="px-4 py-2 font-medium">Location</th>
              <th className="px-4 py-2 font-medium">Hits</th>
              <th className="px-4 py-2 font-medium">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data.points.map((p, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-gray-300 font-mono text-xs">
                  {p.ip}
                  {p.is_vpn && (
                    <span className="ml-1 rounded bg-orange-900/40 px-1 text-[10px] text-orange-400">
                      VPN
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-400">
                  {[p.city, p.region, p.country].filter(Boolean).join(", ") ||
                    "Unknown"}
                </td>
                <td className="px-4 py-2 text-gray-400">{p.hits}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {p.last_seen
                    ? new Date(p.last_seen).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
