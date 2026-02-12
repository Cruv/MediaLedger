import { useParams, Link } from "react-router-dom";
import { useUser } from "../hooks/useUsers";
import StatCard from "../components/common/StatCard";

function formatWatchTime(sec?: number): string {
  if (!sec) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: user, isLoading } = useUser(id!);

  if (isLoading) {
    return <div className="py-10 text-center text-gray-500">Loading user...</div>;
  }

  if (!user) {
    return <div className="py-10 text-center text-gray-500">User not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/users" className="text-sm text-gray-500 hover:text-gray-300">
          &larr; Users
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{user.username}</h1>
        <p className="text-sm text-gray-500">
          {user.server_name} &middot; {user.server_type}
          {user.is_admin && " \u00b7 Admin"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Plays" value={user.total_plays ?? 0} />
        <StatCard
          label="Watch Time"
          value={formatWatchTime(user.total_watch_time_sec)}
        />
        <StatCard label="Devices" value={user.devices.length} />
      </div>

      {/* Devices */}
      {user.devices.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Devices</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {user.devices.map((d, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-800 bg-gray-900 p-4"
              >
                <p className="font-medium">{d.device_name || "Unknown Device"}</p>
                <p className="text-sm text-gray-400">{d.client_name}</p>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>{d.session_count} sessions</span>
                  <span>
                    {d.last_seen_at
                      ? new Date(d.last_seen_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent sessions */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Sessions</h2>
        {user.recent_sessions.length === 0 ? (
          <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
            No sessions recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Watched</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {user.recent_sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 font-medium">
                      {s.item_title || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{s.item_type}</td>
                    <td className="px-4 py-3 text-gray-500">{s.device_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          s.completed ? "text-green-400" : "text-yellow-400"
                        }
                      >
                        {Math.round(s.watched_pct)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(s.started_at).toLocaleDateString()}
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
