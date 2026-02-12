import { useState } from "react";
import { useRecentlyAdded, useNewsletterPreview, useSendNewsletter } from "../hooks/useRecentlyAdded";
import { useServers } from "../hooks/useServers";
import StatCard from "../components/common/StatCard";

const DAYS_OPTIONS = [1, 3, 7, 14, 30];
const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "movies", label: "Movies" },
  { value: "tvshows", label: "TV Shows" },
  { value: "music", label: "Music" },
];

function formatDuration(ticks: number | undefined): string {
  if (!ticks) return "—";
  const minutes = Math.round(ticks / 600_000_000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function RecentlyAdded() {
  const [days, setDays] = useState(7);
  const [serverId, setServerId] = useState("");
  const [libraryType, setLibraryType] = useState("");
  const [showNewsletter, setShowNewsletter] = useState(false);

  const { data: servers } = useServers();
  const { data, isLoading } = useRecentlyAdded({
    days,
    server_id: serverId || undefined,
    library_type: libraryType || undefined,
  });

  const newsletterPreview = useNewsletterPreview({
    days,
    server_id: serverId || undefined,
  });
  const sendMut = useSendNewsletter();

  const items = data?.items ?? [];
  const movies = items.filter((i) => i.item_type === "Movie");
  const episodes = items.filter((i) => i.item_type === "Episode");
  const other = items.filter((i) => i.item_type !== "Movie" && i.item_type !== "Episode");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recently Added</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowNewsletter(!showNewsletter);
              if (!showNewsletter) newsletterPreview.refetch();
            }}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
          >
            {showNewsletter ? "Hide Newsletter" : "Newsletter Preview"}
          </button>
          <button
            onClick={() => sendMut.mutate({ days, server_id: serverId || undefined })}
            disabled={sendMut.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
          >
            {sendMut.isPending ? "Sending..." : "Send Newsletter"}
          </button>
        </div>
      </div>

      {sendMut.data && (
        <div className="rounded-lg border border-green-900 bg-green-950/50 p-3 text-sm text-green-400">
          {sendMut.data.message}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg border border-gray-800 bg-gray-900 p-1">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                days === d
                  ? "bg-brand-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        <select
          value={serverId}
          onChange={(e) => setServerId(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200"
        >
          <option value="">All Servers</option>
          {servers?.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={libraryType}
          onChange={(e) => setLibraryType(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Added" value={data?.total ?? 0} />
        <StatCard label="Movies" value={movies.length} />
        <StatCard label="Episodes" value={episodes.length} />
        <StatCard label="Other" value={other.length} />
      </div>

      {/* Newsletter Preview */}
      {showNewsletter && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-lg font-semibold">Newsletter Preview</h2>
          {newsletterPreview.isLoading ? (
            <div className="py-4 text-center text-gray-500">Generating preview...</div>
          ) : newsletterPreview.data ? (
            <div className="rounded-lg border border-gray-700 overflow-hidden">
              <iframe
                title="Newsletter Preview"
                srcDoc={newsletterPreview.data.html}
                className="w-full bg-gray-950"
                style={{ minHeight: 500 }}
              />
            </div>
          ) : (
            <div className="py-4 text-center text-gray-500">Click to load preview</div>
          )}
        </div>
      )}

      {/* Items List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No items added in the last {days} day{days !== 1 ? "s" : ""}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Genres</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Library</th>
                <th className="px-4 py-3 font-medium">Server</th>
                <th className="px-4 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map((item) => {
                let displayTitle = item.title;
                if (item.item_type === "Episode" && item.season_number != null && item.episode_number != null) {
                  displayTitle += ` S${String(item.season_number).padStart(2, "0")}E${String(item.episode_number).padStart(2, "0")}`;
                }
                return (
                  <tr key={item.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 font-medium text-gray-200">{displayTitle}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        item.item_type === "Movie" ? "bg-blue-900/40 text-blue-400" :
                        item.item_type === "Episode" ? "bg-purple-900/40 text-purple-400" :
                        "bg-gray-800 text-gray-300"
                      }`}>
                        {item.item_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{item.year ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {item.genres?.slice(0, 3).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDuration(item.runtime_ticks)}</td>
                    <td className="px-4 py-3 text-gray-400">{item.library_name}</td>
                    <td className="px-4 py-3 text-gray-400">{item.server_name}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {item.added_at ? new Date(item.added_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
