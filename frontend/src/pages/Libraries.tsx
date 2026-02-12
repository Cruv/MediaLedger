import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useLibraries } from "../hooks/useLibraries";
import { triggerLibrarySync } from "../api/libraries";

export default function Libraries() {
  const { data: libraries, isLoading } = useLibraries();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      await triggerLibrarySync();
      // Poll for updates after delays to let the sync progress
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["libraries"] });
      }, 5000);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["libraries"] });
        setSyncing(false);
      }, 15000);
    } catch {
      setSyncing(false);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Libraries</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track library contents and watched progress across all servers.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {!libraries || libraries.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center">
          <p className="text-gray-500">
            No libraries synced yet. Add a server and click "Sync Now" or wait for the automatic sync (runs hourly).
          </p>
        </div>
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
