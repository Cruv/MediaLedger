import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useUser } from "../hooks/useUsers";
import { useUserNotes, useCreateNote, useUpdateNote, useDeleteNote, useAuditLog } from "../hooks/useAudit";
import StatCard from "../components/common/StatCard";

function formatWatchTime(sec?: number): string {
  if (!sec) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function NotesSection({ userId }: { userId: string }) {
  const { data: notes, isLoading } = useUserNotes(userId);
  const createMut = useCreateNote(userId);
  const updateMut = useUpdateNote(userId);
  const deleteMut = useDeleteNote(userId);
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleCreate = () => {
    if (!newNote.trim()) return;
    createMut.mutate({ content: newNote.trim() });
    setNewNote("");
  };

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const saveEdit = () => {
    if (!editingId || !editContent.trim()) return;
    updateMut.mutate({ noteId: editingId, content: editContent.trim() });
    setEditingId(null);
  };

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Notes</h2>

      {/* Add note */}
      <div className="mb-4 flex gap-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about this user..."
          rows={2}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleCreate();
          }}
        />
        <button
          onClick={handleCreate}
          disabled={!newNote.trim() || createMut.isPending}
          className="self-end rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-gray-500">Loading notes...</div>
      ) : !notes || notes.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-center text-sm text-gray-500">
          No notes yet.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-lg border p-3 ${
                note.pinned ? "border-brand-700 bg-brand-950/20" : "border-gray-800 bg-gray-900"
              }`}
            >
              {editingId === note.id ? (
                <div className="flex gap-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                    className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none resize-none"
                  />
                  <div className="flex flex-col gap-1">
                    <button onClick={saveEdit} className="rounded bg-green-800 px-2 py-1 text-xs text-green-300 hover:bg-green-700">Save</button>
                    <button onClick={() => setEditingId(null)} className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm text-gray-200">{note.content}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {new Date(note.created_at).toLocaleString()}
                      {note.pinned && <span className="ml-2 text-brand-400">pinned</span>}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateMut.mutate({ noteId: note.id, pinned: !note.pinned })}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        {note.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        onClick={() => startEdit(note.id, note.content)}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMut.mutate(note.id)}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UserAuditSection({ userId }: { userId: string }) {
  const { data, isLoading } = useAuditLog({ target_type: "user", target_id: userId, page_size: 20 });

  if (isLoading) return null;
  if (!data || data.items.length === 0) return null;

  const ACTION_COLORS: Record<string, string> = {
    "note.created": "text-blue-400",
    "note.updated": "text-blue-400",
    "note.deleted": "text-red-400",
    "tag.assigned": "text-purple-400",
    "tag.unassigned": "text-purple-400",
    "user.disabled": "text-red-400",
    "user.enabled": "text-green-400",
    "rule.triggered": "text-orange-400",
  };

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Activity Log</h2>
      <div className="space-y-1">
        {data.items.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm">
            <span className={`font-mono text-xs ${ACTION_COLORS[entry.action] ?? "text-gray-400"}`}>
              {entry.action}
            </span>
            <span className="flex-1 text-gray-400">
              {entry.target_label && <span className="text-gray-300">{entry.target_label}</span>}
              {entry.details && !!(entry.details as Record<string, unknown>).preview && (
                <span className="ml-1 text-gray-500">
                  — {String((entry.details as Record<string, unknown>).preview).slice(0, 60)}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-gray-600">
              {new Date(entry.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
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
        {user.tags && user.tags.length > 0 && (
          <div className="mt-2 flex gap-1">
            {user.tags.map((t) => (
              <span
                key={t.id}
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: t.color + "33", color: t.color }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
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

      {/* Notes */}
      <NotesSection userId={id!} />

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

      {/* Activity log for this user */}
      <UserAuditSection userId={id!} />
    </div>
  );
}
