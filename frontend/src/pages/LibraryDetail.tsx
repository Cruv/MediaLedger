import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useLibrary, useLibraryItems } from "../hooks/useLibraries";

function formatRuntime(ticks?: number): string {
  if (!ticks) return "--";
  const totalMin = Math.floor(ticks / 10_000_000 / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function LibraryDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: library } = useLibrary(id!);
  const [page, setPage] = useState(1);
  const [watchedFilter, setWatchedFilter] = useState<boolean | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data, isLoading } = useLibraryItems(id!, {
    page,
    page_size: 25,
    watched: watchedFilter,
    sort_by: sortBy,
    sort_order: sortOrder,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/libraries" className="text-sm text-gray-500 hover:text-gray-300">
          &larr; Libraries
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{library?.name ?? "Library"}</h1>
        {library && (
          <p className="text-sm text-gray-500">
            {library.server_name} &middot; {library.library_type} &middot;{" "}
            {library.total_items} items ({library.watched_items} watched,{" "}
            {library.unwatched_items} unwatched)
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search titles..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />

        <select
          value={watchedFilter === undefined ? "all" : watchedFilter ? "watched" : "unwatched"}
          onChange={(e) => {
            const v = e.target.value;
            setWatchedFilter(v === "all" ? undefined : v === "watched");
            setPage(1);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
        >
          <option value="all">All</option>
          <option value="watched">Watched</option>
          <option value="unwatched">Unwatched</option>
        </select>

        <select
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => {
            const [sb, so] = e.target.value.split(":");
            setSortBy(sb);
            setSortOrder(so as "asc" | "desc");
            setPage(1);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
        >
          <option value="title:asc">Title A-Z</option>
          <option value="title:desc">Title Z-A</option>
          <option value="year:desc">Year (newest)</option>
          <option value="year:asc">Year (oldest)</option>
          <option value="added_at:desc">Recently added</option>
          <option value="global_play_count:desc">Most played</option>
        </select>
      </div>

      {/* Items table */}
      {isLoading ? (
        <div className="py-10 text-center text-gray-500">Loading...</div>
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No items found.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Year</th>
                  <th className="px-4 py-3 font-medium">Runtime</th>
                  <th className="px-4 py-3 font-medium">Plays</th>
                  <th className="px-4 py-3 font-medium">Last Played</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-gray-400">{item.item_type}</td>
                    <td className="px-4 py-3 text-gray-400">{item.year ?? "--"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatRuntime(item.runtime_ticks)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          item.global_play_count > 0
                            ? "text-green-400"
                            : "text-gray-600"
                        }
                      >
                        {item.global_play_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.global_last_played_at
                        ? new Date(item.global_last_played_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.added_at
                        ? new Date(item.added_at).toLocaleDateString()
                        : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
