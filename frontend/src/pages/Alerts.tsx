import { useState } from "react";
import {
  useAlertRules,
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
  useAlertEvents,
  useResolveEvent,
} from "../hooks/useAlerts";
import { CONDITION_TYPES } from "../types/alerts";

const CONFIG_FIELDS: Record<string, { label: string; key: string; type: string; default: number }[]> = {
  concurrent_streams: [{ label: "Max Streams", key: "max_streams", type: "number", default: 2 }],
  new_device: [{ label: "Lookback Hours", key: "lookback_hours", type: "number", default: 24 }],
  sharing_score_threshold: [{ label: "Min Score", key: "min_score", type: "number", default: 70 }],
  watch_threshold: [{ label: "Max Hours/Day", key: "max_hours_per_day", type: "number", default: 12 }],
  inactive_user: [{ label: "Inactive Days", key: "inactive_days", type: "number", default: 30 }],
};

export default function Alerts() {
  const { data: rules } = useAlertRules();
  const [eventsPage, setEventsPage] = useState(1);
  const [showResolved, setShowResolved] = useState(false);
  const { data: events } = useAlertEvents(eventsPage, showResolved ? undefined : false);
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const resolveEvent = useResolveEvent();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("concurrent_streams");
  const [newConfig, setNewConfig] = useState<Record<string, number>>({});
  const [newCooldown, setNewCooldown] = useState(60);

  async function handleCreate() {
    if (!newName.trim()) return;
    const fields = CONFIG_FIELDS[newType] || [];
    const config: Record<string, number> = {};
    for (const f of fields) {
      config[f.key] = newConfig[f.key] ?? f.default;
    }
    await createRule.mutateAsync({
      name: newName.trim(),
      condition_type: newType,
      condition_config: config,
      cooldown_minutes: newCooldown,
    });
    setNewName("");
    setNewConfig({});
    setShowCreate(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          {showCreate ? "Cancel" : "New Rule"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Rule Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Too many streams"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Condition Type</label>
              <select
                value={newType}
                onChange={(e) => { setNewType(e.target.value); setNewConfig({}); }}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              >
                {CONDITION_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-600">
                {CONDITION_TYPES.find((ct) => ct.value === newType)?.description}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {(CONFIG_FIELDS[newType] || []).map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs text-gray-500">{f.label}</label>
                <input
                  type="number"
                  value={newConfig[f.key] ?? f.default}
                  onChange={(e) => setNewConfig({ ...newConfig, [f.key]: Number(e.target.value) })}
                  className="w-28 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs text-gray-500">Cooldown (min)</label>
              <input
                type="number"
                value={newCooldown}
                onChange={(e) => setNewCooldown(Number(e.target.value))}
                className="w-28 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            Create Rule
          </button>
        </div>
      )}

      {/* Rules list */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Rules</h2>
        {!rules || rules.length === 0 ? (
          <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
            No alert rules configured. Create one to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{rule.name}</p>
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                      {CONDITION_TYPES.find((ct) => ct.value === rule.condition_type)?.label || rule.condition_type}
                    </span>
                    {rule.unresolved_count > 0 && (
                      <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-xs text-red-400">
                        {rule.unresolved_count} unresolved
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Config: {JSON.stringify(rule.condition_config)} &middot; Cooldown: {rule.cooldown_minutes}min
                    &middot; {rule.recent_event_count} events this week
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateRule.mutate({ id: rule.id, is_enabled: !rule.is_enabled })
                    }
                    className={`rounded-lg px-3 py-1 text-xs font-medium ${
                      rule.is_enabled
                        ? "bg-green-900/40 text-green-400"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {rule.is_enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button
                    onClick={() => deleteRule.mutate(rule.id)}
                    className="rounded-lg px-3 py-1 text-xs text-red-400 hover:bg-red-900/30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Events */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Events</h2>
          <label className="flex items-center gap-1.5 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-brand-500"
            />
            Show resolved
          </label>
        </div>

        {!events || events.items.length === 0 ? (
          <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
            No alert events.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {events.items.map((event) => (
                <div
                  key={event.id}
                  className={`rounded-lg border p-4 ${
                    event.resolved
                      ? "border-gray-800 bg-gray-900/50"
                      : "border-yellow-900/50 bg-yellow-950/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {event.rule_name || "Unknown Rule"}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {new Date(event.triggered_at).toLocaleString()}
                      </p>
                      {event.context_json && !!(event.context_json as Record<string, unknown>).summary && (
                        <p className="mt-1 text-sm text-gray-400">
                          {String((event.context_json as Record<string, unknown>).summary)}
                        </p>
                      )}
                    </div>
                    {!event.resolved && (
                      <button
                        onClick={() => resolveEvent.mutate(event.id)}
                        className="rounded-lg bg-green-900/30 px-3 py-1 text-xs text-green-400 hover:bg-green-900/50"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {events.total > events.page_size && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {(events.page - 1) * events.page_size + 1}&ndash;
                  {Math.min(events.page * events.page_size, events.total)} of {events.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                    disabled={eventsPage === 1}
                    className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setEventsPage((p) => p + 1)}
                    disabled={events.page * events.page_size >= events.total}
                    className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
