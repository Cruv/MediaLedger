import { useState } from "react";
import {
  useCreateAgent,
  useDeleteAgent,
  useNotificationAgents,
  useNotificationLog,
  useTestAgent,
  useTriggers,
} from "../hooks/useNotifications";
import type { NotificationAgentCreate } from "../types/notification";

const AGENT_TYPES = [
  { value: "discord", label: "Discord", fields: ["webhook_url"] },
  { value: "gotify", label: "Gotify", fields: ["url", "token", "priority"] },
  { value: "ntfy", label: "ntfy", fields: ["url", "topic", "token"] },
  { value: "webhook", label: "Webhook (JSON)", fields: ["url"] },
  { value: "email", label: "Email (SMTP)", fields: ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "from_address", "to_address"] },
];

export default function Settings() {
  const { data: agents } = useNotificationAgents();
  const { data: triggers } = useTriggers();
  const { data: logs } = useNotificationLog();
  const createMut = useCreateAgent();
  const deleteMut = useDeleteAgent();
  const testMut = useTestAgent();

  const [showForm, setShowForm] = useState(false);
  const [agentType, setAgentType] = useState("discord");
  const [name, setName] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);

  const typeDef = AGENT_TYPES.find((t) => t.value === agentType);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const body: NotificationAgentCreate = {
      agent_type: agentType,
      name: name.trim(),
      config_json: config,
      triggers: selectedTriggers,
    };
    createMut.mutate(body, {
      onSuccess: () => {
        setShowForm(false);
        setName("");
        setConfig({});
        setSelectedTriggers([]);
      },
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure notification agents for Discord, Gotify, ntfy, email, and webhooks.
        </p>
      </div>

      {/* Notification Agents */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notification Agents</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium hover:bg-brand-500"
          >
            {showForm ? "Cancel" : "Add Agent"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Agent name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                required
              />
              <select
                value={agentType}
                onChange={(e) => {
                  setAgentType(e.target.value);
                  setConfig({});
                }}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
              >
                {AGENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Config fields */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {typeDef?.fields.map((field) => (
                <input
                  key={field}
                  type={field.includes("password") || field.includes("token") ? "password" : "text"}
                  placeholder={field.replace(/_/g, " ")}
                  value={config[field] ?? ""}
                  onChange={(e) => setConfig({ ...config, [field]: e.target.value })}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              ))}
            </div>

            {/* Triggers */}
            {triggers && (
              <div>
                <p className="mb-2 text-sm text-gray-400">Triggers:</p>
                <div className="flex flex-wrap gap-2">
                  {triggers.map((t) => (
                    <label key={t} className="flex items-center gap-1.5 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={selectedTriggers.includes(t)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTriggers([...selectedTriggers, t]);
                          } else {
                            setSelectedTriggers(selectedTriggers.filter((x) => x !== t));
                          }
                        }}
                        className="rounded border-gray-700"
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={createMut.isPending}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
            >
              {createMut.isPending ? "Creating..." : "Create Agent"}
            </button>
          </form>
        )}

        {/* Agents list */}
        {!agents || agents.length === 0 ? (
          <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
            No notification agents configured.
          </p>
        ) : (
          <div className="space-y-3">
            {agents.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.name}</p>
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{a.agent_type}</span>
                    <span className={`rounded px-2 py-0.5 text-xs ${a.is_enabled ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                      {a.is_enabled ? "enabled" : "disabled"}
                    </span>
                  </div>
                  {a.triggers.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Triggers: {a.triggers.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testMut.mutate(a.id)}
                    disabled={testMut.isPending}
                    className="rounded-lg border border-gray-700 px-3 py-1 text-xs hover:bg-gray-800"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete agent "${a.name}"?`)) {
                        deleteMut.mutate(a.id);
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {testMut.data && (
          <div className={`rounded-lg border p-3 text-sm ${testMut.data.success ? "border-green-900 bg-green-950/50 text-green-400" : "border-red-900 bg-red-950/50 text-red-400"}`}>
            {testMut.data.message}
          </div>
        )}
      </section>

      {/* Recent Notification Log */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Notifications</h2>
        {!logs || logs.length === 0 ? (
          <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
            No notifications sent yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Trigger</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 text-gray-400">{l.trigger_type}</td>
                    <td className="px-4 py-3">{l.subject || "--"}</td>
                    <td className="px-4 py-3">
                      {l.success ? (
                        <span className="text-green-400">Sent</span>
                      ) : (
                        <span className="text-red-400" title={l.error_message ?? ""}>Failed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(l.sent_at).toLocaleString()}</td>
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
