import { Link } from "react-router-dom";
import { useLibraries } from "../hooks/useLibraries";

export default function Libraries() {
  const { data: libraries, isLoading } = useLibraries();

  if (isLoading) {
    return <div className="py-10 text-center text-gray-500">Loading libraries...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Libraries</h1>

      {!libraries || libraries.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No libraries synced yet. Add a server and wait for the initial sync.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {libraries.map((lib) => {
            const total = lib.total_items ?? 0;
            const watched = lib.watched_items ?? 0;
            const pct = total > 0 ? Math.round((watched / total) * 100) : 0;

            return (
              <Link
                key={lib.id}
                to={`/libraries/${lib.id}`}
                className="group rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold group-hover:text-brand-400">{lib.name}</p>
                    <p className="text-sm text-gray-500">
                      {lib.server_name} &middot; {lib.library_type}
                    </p>
                  </div>
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                    {total} items
                  </span>
                </div>

                {/* Watched progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{watched} watched</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {lib.last_synced_at && (
                  <p className="mt-3 text-xs text-gray-600">
                    Last synced: {new Date(lib.last_synced_at).toLocaleString()}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
