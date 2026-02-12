import { useState } from "react";
import { Link } from "react-router-dom";
import { useUsers } from "../hooks/useUsers";

function formatWatchTime(sec?: number): string {
  if (!sec) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useUsers(page, 25, search || undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-500">Loading...</div>
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No users found.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Server</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Total Plays</th>
                  <th className="px-4 py-3 font-medium">Watch Time</th>
                  <th className="px-4 py-3 font-medium">Last Activity</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.items.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/users/${user.id}`}
                        className="font-medium text-brand-400 hover:text-brand-300"
                      >
                        {user.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{user.server_name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                        {user.server_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{user.total_plays ?? 0}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatWatchTime(user.total_watch_time_sec)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {user.last_activity_at
                        ? new Date(user.last_activity_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_admin && (
                        <span className="rounded bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-400">
                          Admin
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {(data.page - 1) * data.page_size + 1}–
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
