import { useState } from "react";
import {
  useUnwatched,
  useCompletionRates,
  usePopularity,
  useLibraryStats,
} from "../hooks/useInsights";

type Tab = "popularity" | "completion" | "unwatched" | "libraries";

function PopularityTab() {
  const [days, setDays] = useState(7);
  const { data } = usePopularity(days);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-400">Period:</label>
        {[7, 14, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${
              days === d ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {!data || data.items.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No playback data for this period.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium w-8">#</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium text-right">Plays</th>
                <th className="px-4 py-2 font-medium text-right">Viewers</th>
                <th className="px-4 py-2 font-medium text-right">Hours</th>
                <th className="px-4 py-2 font-medium text-right">Avg %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {data.items.map((item, i) => (
                <tr key={i} className="bg-gray-900">
                  <td className="px-4 py-2.5 text-gray-600 font-mono">{i + 1}</td>
                  <td className="px-4 py-2.5 text-gray-200 font-medium">{item.title}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-300">{item.plays}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{item.unique_viewers}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{item.total_hours}h</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={item.avg_watched_pct >= 80 ? "text-green-400" : item.avg_watched_pct >= 50 ? "text-yellow-400" : "text-red-400"}>
                      {item.avg_watched_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CompletionTab() {
  const [days, setDays] = useState(30);
  const { data } = useCompletionRates(days);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-400">Period:</label>
        {[7, 30, 90, 365].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${
              days === d ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {d === 365 ? "1y" : `${d}d`}
          </button>
        ))}
      </div>

      {/* By type */}
      {data?.by_type && data.by_type.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-400">By Content Type</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {data.by_type.map((t) => (
              <div key={t.type} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                <p className="text-sm text-gray-400">{t.type}</p>
                <p className="text-2xl font-bold">{t.completion_rate}%</p>
                <div className="mt-1 h-1.5 w-full rounded-full bg-gray-800">
                  <div
                    className="h-1.5 rounded-full bg-brand-500"
                    style={{ width: `${Math.min(t.completion_rate, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {t.completed}/{t.total_plays} plays completed &middot; avg {t.avg_watched_pct}% watched
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most dropped */}
      {data?.most_dropped && data.most_dropped.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-400">Most Dropped Content</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/60 text-left text-xs text-gray-500">
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium text-right">Plays</th>
                  <th className="px-4 py-2 font-medium text-right">Completed</th>
                  <th className="px-4 py-2 font-medium text-right">Rate</th>
                  <th className="px-4 py-2 font-medium text-right">Avg %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {data.most_dropped.map((item, i) => (
                  <tr key={i} className="bg-gray-900">
                    <td className="px-4 py-2.5 text-gray-200">{item.title}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{item.total_plays}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{item.completed}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={item.completion_rate < 30 ? "text-red-400" : "text-yellow-400"}>
                        {item.completion_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{item.avg_watched_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function UnwatchedTab() {
  const [daysSince, setDaysSince] = useState(30);
  const { data } = useUnwatched({ days_since_added: daysSince });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-400">Added more than:</label>
        {[7, 30, 90, 180].map((d) => (
          <button
            key={d}
            onClick={() => setDaysSince(d)}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${
              daysSince === d ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {d}d ago
          </button>
        ))}
      </div>

      {data && (
        <p className="text-sm text-gray-500">
          {data.total} unwatched items (showing {data.items.length})
        </p>
      )}

      {!data || data.items.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No unwatched content found. Everything has been played at least once!
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Year</th>
                <th className="px-4 py-2 font-medium">Added</th>
                <th className="px-4 py-2 font-medium">Library</th>
                <th className="px-4 py-2 font-medium">Genres</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {data.items.map((item) => (
                <tr key={item.id} className="bg-gray-900">
                  <td className="px-4 py-2.5 text-gray-200">{item.title}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{item.year || "—"}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {item.added_at ? new Date(item.added_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{item.library}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 max-w-xs truncate">
                    {item.genres.join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LibraryStatsTab() {
  const { data } = useLibraryStats();

  if (!data || data.length === 0) {
    return (
      <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
        No library data available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((lib) => (
        <div key={lib.library_id} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-gray-200">{lib.name}</p>
              <p className="text-xs text-gray-500">{lib.server} &middot; {lib.type}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{lib.total_items}</p>
              <p className="text-xs text-gray-500">items</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">
                  {lib.watched_items} watched / {lib.unwatched_items} unwatched
                </span>
                <span className={lib.watched_pct >= 70 ? "text-green-400" : lib.watched_pct >= 40 ? "text-yellow-400" : "text-red-400"}>
                  {lib.watched_pct}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-800">
                <div
                  className="h-1.5 rounded-full bg-brand-500"
                  style={{ width: `${lib.watched_pct}%` }}
                />
              </div>
            </div>
            <div className="text-right text-xs text-gray-500 shrink-0">
              {lib.total_runtime_hours}h runtime
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Insights() {
  const [tab, setTab] = useState<Tab>("popularity");

  const tabs: { key: Tab; label: string }[] = [
    { key: "popularity", label: "Popular Now" },
    { key: "completion", label: "Completion Rates" },
    { key: "unwatched", label: "Unwatched" },
    { key: "libraries", label: "Library Stats" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Media Insights</h1>
        <p className="mt-1 text-sm text-gray-500">
          Understand what your users watch, what gets dropped, and what sits untouched.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-900 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-brand-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "popularity" && <PopularityTab />}
      {tab === "completion" && <CompletionTab />}
      {tab === "unwatched" && <UnwatchedTab />}
      {tab === "libraries" && <LibraryStatsTab />}
    </div>
  );
}
