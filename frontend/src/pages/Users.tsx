import { useState } from "react";
import { Link } from "react-router-dom";
import { Link2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useUsers } from "../hooks/useUsers";
import { useServers } from "../hooks/useServers";
import { useTags, useCreateTag, useDeleteTag, useAssignTag } from "../hooks/useTags";

type UserSortKey = "username" | "server_name" | "last_activity_at";

function formatWatchTime(sec?: number): string {
  if (!sec) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#6b7280",
];

export default function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [serverId, setServerId] = useState("");
  const [tagId, setTagId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [sortBy, setSortBy] = useState<UserSortKey>("username");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: UserSortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(key);
      setSortDir(key === "last_activity_at" ? "desc" : "asc");
    }
    setPage(1);
  }

  const { data: servers } = useServers();
  const { data: tags } = useTags();
  const { data, isLoading } = useUsers({
    page,
    search: search || undefined,
    serverId: serverId || undefined,
    tagId: tagId || undefined,
    sortBy,
    sortDir,
  });

  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const assignTag = useAssignTag();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!data) return;
    if (selected.size === data.items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.items.map((u) => u.id)));
    }
  }

  async function handleAssignTag(assignTagId: string) {
    if (selected.size === 0) return;
    await assignTag.mutateAsync({ tagId: assignTagId, userIds: [...selected] });
    setSelected(new Set());
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    await createTag.mutateAsync({ name: newTagName.trim(), color: newTagColor });
    setNewTagName("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users across all servers with tags, bulk actions, and filtering.
          </p>
        </div>
        <button
          onClick={() => setShowTagManager(!showTagManager)}
          className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:text-white"
        >
          {showTagManager ? "Hide Tags" : "Manage Tags"}
        </button>
      </div>

      {/* Tag manager */}
      {showTagManager && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-300">Tags</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {tags?.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: t.color + "20", color: t.color, border: `1px solid ${t.color}40` }}
              >
                {t.name}
                <span className="text-gray-500">({t.user_count})</span>
                <button
                  onClick={() => deleteTag.mutate(t.id)}
                  className="ml-1 text-gray-500 hover:text-red-400"
                  title="Delete tag"
                >
                  &times;
                </button>
              </div>
            ))}
            {(!tags || tags.length === 0) && (
              <p className="text-xs text-gray-500">No tags yet. Create one below.</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <div className="flex gap-1">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: newTagColor === c ? "white" : "transparent",
                    transform: newTagColor === c ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <button
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
        <select
          value={serverId}
          onChange={(e) => { setServerId(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Servers</option>
          {servers?.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={tagId}
          onChange={(e) => { setTagId(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Tags</option>
          {tags?.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {/* Bulk tag assign */}
        {selected.size > 0 && tags && tags.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-brand-900/30 px-3 py-1.5">
            <span className="text-xs text-brand-300">{selected.size} selected</span>
            <select
              onChange={(e) => {
                if (e.target.value) handleAssignTag(e.target.value);
                e.target.value = "";
              }}
              className="rounded border border-brand-700 bg-brand-900/50 px-2 py-1 text-xs text-brand-200 focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>Assign tag...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" /></div>
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
                  <th className="px-4 py-3 font-medium">
                    <input
                      type="checkbox"
                      checked={selected.size === data.items.length && data.items.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-600 bg-gray-800 text-brand-500"
                    />
                  </th>
                  {(["username", "server_name", "last_activity_at"] as const).map((key) => {
                    const labels: Record<UserSortKey, string> = { username: "Username", server_name: "Server", last_activity_at: "Last Activity" };
                    if (key === "username") return (
                      <th key={key} className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-200 ${sortBy === key ? "text-gray-200" : ""}`} onClick={() => toggleSort(key)}>
                        <span className="inline-flex items-center gap-1">
                          {labels[key]}
                          {sortBy === key ? (sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />}
                        </span>
                      </th>
                    );
                    if (key === "server_name") return (
                      <th key={key} className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-200 ${sortBy === key ? "text-gray-200" : ""}`} onClick={() => toggleSort(key)}>
                        <span className="inline-flex items-center gap-1">
                          {labels[key]}
                          {sortBy === key ? (sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />}
                        </span>
                      </th>
                    );
                    return null;
                  })}
                  <th className="px-4 py-3 font-medium">Linked</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium">Total Plays</th>
                  <th className="px-4 py-3 font-medium">Watch Time</th>
                  <th className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-200 ${sortBy === "last_activity_at" ? "text-gray-200" : ""}`} onClick={() => toggleSort("last_activity_at")}>
                    <span className="inline-flex items-center gap-1">
                      Last Activity
                      {sortBy === "last_activity_at" ? (sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />}
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.items.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        className="rounded border-gray-600 bg-gray-800 text-brand-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/users/${user.id}`}
                        className="font-medium text-brand-400 hover:text-brand-300"
                      >
                        {user.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                        {user.server_type}
                      </span>{" "}
                      {user.server_name}
                    </td>
                    <td className="px-4 py-3">
                      {(user.linked_server_count ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-800/40">
                          <Link2 className="h-3 w-3" />
                          {(user.linked_server_count ?? 0) + 1} servers
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.tags?.map((t) => (
                          <span
                            key={t.id}
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: t.color + "20",
                              color: t.color,
                              border: `1px solid ${t.color}40`,
                            }}
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
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
                      <div className="flex flex-wrap gap-1">
                        {user.is_admin && (
                          <span className="rounded bg-yellow-900/40 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
                            Admin
                          </span>
                        )}
                        {user.is_disabled && (
                          <span className="rounded bg-red-900/40 px-2 py-0.5 text-[10px] font-medium text-red-400">
                            Disabled
                          </span>
                        )}
                        {user.subscription_status && (
                          <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                            user.subscription_status === "active"
                              ? "bg-green-900/40 text-green-400"
                              : user.subscription_status === "past_due"
                                ? "bg-yellow-900/40 text-yellow-400"
                                : "bg-red-900/40 text-red-400"
                          }`}>
                            {user.subscription_status}
                          </span>
                        )}
                        {user.expires_at && (
                          <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                            new Date(user.expires_at) < new Date()
                              ? "bg-red-900/40 text-red-400"
                              : new Date(user.expires_at) < new Date(Date.now() + 7 * 86400000)
                                ? "bg-orange-900/40 text-orange-400"
                                : "bg-gray-800 text-gray-400"
                          }`}>
                            exp {new Date(user.expires_at).toLocaleDateString()}
                          </span>
                        )}
                        {user.invite_code_id && (
                          <span className="rounded bg-brand-900/40 px-2 py-0.5 text-[10px] font-medium text-brand-400">
                            Invited
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {(data.page - 1) * data.page_size + 1}&ndash;
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
