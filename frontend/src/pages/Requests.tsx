import { useState } from "react";
import StatCard from "../components/common/StatCard";
import { useCreateRequest, useDeleteRequest, useRequests, useRequestStats } from "../hooks/useRequests";
import type { RequestCreate } from "../types/request";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "available", label: "Available" },
  { value: "watched", label: "Watched" },
  { value: "partially_watched", label: "Partially Watched" },
  { value: "declined", label: "Declined" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "manual", label: "Manual" },
  { value: "overseerr", label: "Overseerr" },
  { value: "jellyseerr", label: "Jellyseerr" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-800 text-gray-400",
  approved: "bg-blue-900/40 text-blue-400",
  available: "bg-yellow-900/40 text-yellow-400",
  watched: "bg-green-900/40 text-green-400",
  partially_watched: "bg-orange-900/40 text-orange-400",
  declined: "bg-red-900/40 text-red-400",
};

export default function Requests() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useRequests(
    page,
    25,
    statusFilter || undefined,
    sourceFilter || undefined,
    search || undefined,
  );
  const { data: stats } = useRequestStats();
  const createMut = useCreateRequest();
  const deleteMut = useDeleteRequest();

  const [form, setForm] = useState<RequestCreate>({
    title: "",
    item_type: "Movie",
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    createMut.mutate(form, {
      onSuccess: () => {
        setForm({ title: "", item_type: "Movie" });
        setShowForm(false);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Requests</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium hover:bg-brand-500"
        >
          {showForm ? "Cancel" : "Add Request"}
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total" value={stats.total_requests} />
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Available" value={stats.available} />
          <StatCard label="Watched" value={stats.watched} />
          <StatCard
            label="Never Watched"
            value={stats.never_watched}
            sublabel={stats.avg_days_to_watch ? `avg ${stats.avg_days_to_watch}d to watch` : undefined}
          />
        </div>
      )}

      {/* Add request form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              placeholder="Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              required
            />
            <select
              value={form.item_type}
              onChange={(e) => setForm({ ...form, item_type: e.target.value })}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
            >
              <option value="Movie">Movie</option>
              <option value="Series">Series</option>
            </select>
            <input
              type="number"
              placeholder="Year"
              value={form.year ?? ""}
              onChange={(e) => setForm({ ...form, year: e.target.value ? parseInt(e.target.value) : undefined })}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="IMDb ID (e.g. tt1234567)"
              value={form.imdb_id ?? ""}
              onChange={(e) => setForm({ ...form, imdb_id: e.target.value || undefined })}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="number"
              placeholder="TMDb ID"
              value={form.tmdb_id ?? ""}
              onChange={(e) => setForm({ ...form, tmdb_id: e.target.value ? parseInt(e.target.value) : undefined })}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="TVDb ID"
              value={form.tvdb_id ?? ""}
              onChange={(e) => setForm({ ...form, tvdb_id: e.target.value ? parseInt(e.target.value) : undefined })}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={createMut.isPending}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
            >
              {createMut.isPending ? "Creating..." : "Create Request"}
            </button>
          </div>
        </form>
      )}

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
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" /></div>
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No requests found. Add one to start tracking.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Requested</th>
                  <th className="px-4 py-3 font-medium">Fulfilled</th>
                  <th className="px-4 py-3 font-medium">First Watched</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.items.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{req.title}</p>
                        {req.year && <p className="text-xs text-gray-500">{req.year}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{req.item_type}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status] ?? "bg-gray-800 text-gray-400"}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{req.source}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <div>
                        {new Date(req.requested_at).toLocaleDateString()}
                        {req.requested_by_username && (
                          <p className="text-xs">{req.requested_by_username}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {req.fulfilled_at ? (
                        <div>
                          {new Date(req.fulfilled_at).toLocaleDateString()}
                          {req.fulfilled_item_title && (
                            <p className="text-xs truncate max-w-[150px]">{req.fulfilled_item_title}</p>
                          )}
                        </div>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {req.first_watched_at ? (
                        <div>
                          <span className="text-green-400">
                            {new Date(req.first_watched_at).toLocaleDateString()}
                          </span>
                          {req.first_watched_by_username && (
                            <p className="text-xs text-gray-500">{req.first_watched_by_username}</p>
                          )}
                        </div>
                      ) : req.status === "available" ? (
                        <span className="text-yellow-400">Not yet</span>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (confirm(`Delete request "${req.title}"?`)) {
                            deleteMut.mutate(req.id);
                          }
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
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
