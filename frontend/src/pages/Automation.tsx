import { useState } from "react";
import {
  useAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  useAutomationHistory,
} from "../hooks/useAutomation";
import { CONDITION_TYPES, ACTION_TYPES } from "../types/automation";
import type { AutomationRule } from "../types/automation";

/* ─── Dynamic config fields per condition / action ─── */
const CONDITION_CONFIG_FIELDS: Record<
  string,
  { label: string; key: string; type: string; default: number }[]
> = {
  concurrent_streams: [
    { label: "Max Streams", key: "max_streams", type: "number", default: 2 },
  ],
  sharing_score: [
    { label: "Min Score", key: "min_score", type: "number", default: 70 },
  ],
  watch_hours: [
    {
      label: "Max Hours / Day",
      key: "max_hours_per_day",
      type: "number",
      default: 12,
    },
  ],
  inactive_streaming: [
    {
      label: "Inactive Days",
      key: "inactive_days",
      type: "number",
      default: 30,
    },
  ],
};

const ACTION_CONFIG_FIELDS: Record<
  string,
  { label: string; key: string; type: string; default: string }[]
> = {
  kill_sessions: [],
  disable_user: [],
  add_tag: [{ label: "Tag Name", key: "tag_name", type: "text", default: "" }],
  remove_tag: [
    { label: "Tag Name", key: "tag_name", type: "text", default: "" },
  ],
  notify: [
    {
      label: "Message ({username} is replaced)",
      key: "message",
      type: "text",
      default: "Automation rule triggered for {username}",
    },
  ],
};

/* ─── Create Rule Form ─── */
function CreateRuleForm({ onClose }: { onClose: () => void }) {
  const createRule = useCreateAutomationRule();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conditionType, setConditionType] = useState("concurrent_streams");
  const [actionType, setActionType] = useState("notify");
  const [conditionConfig, setConditionConfig] = useState<
    Record<string, string | number>
  >({});
  const [actionConfig, setActionConfig] = useState<
    Record<string, string | number>
  >({});
  const [cooldown, setCooldown] = useState(60);

  async function handleSubmit() {
    if (!name.trim()) return;

    // Build condition config with defaults
    const cFields = CONDITION_CONFIG_FIELDS[conditionType] || [];
    const cConfig: Record<string, unknown> = {};
    for (const f of cFields) {
      cConfig[f.key] =
        conditionConfig[f.key] !== undefined
          ? conditionConfig[f.key]
          : f.type === "number"
            ? f.default
            : f.default;
    }

    // Build action config with defaults
    const aFields = ACTION_CONFIG_FIELDS[actionType] || [];
    const aConfig: Record<string, unknown> = {};
    for (const f of aFields) {
      aConfig[f.key] =
        actionConfig[f.key] !== undefined ? actionConfig[f.key] : f.default;
    }

    await createRule.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      condition_type: conditionType,
      condition_config: cConfig,
      action_type: actionType,
      action_config: aConfig,
      cooldown_minutes: cooldown,
    });
    onClose();
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5 space-y-4">
      <h3 className="text-lg font-semibold">Create Automation Rule</h3>

      {/* Name + Description */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Rule Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kill excess streams"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this rule does"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Condition Type */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            When (Condition)
          </label>
          <select
            value={conditionType}
            onChange={(e) => {
              setConditionType(e.target.value);
              setConditionConfig({});
            }}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            {CONDITION_TYPES.map((ct) => (
              <option key={ct.value} value={ct.value}>
                {ct.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-600">
            {
              CONDITION_TYPES.find((ct) => ct.value === conditionType)
                ?.description
            }
          </p>
        </div>

        {/* Action Type */}
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            Then (Action)
          </label>
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setActionConfig({});
            }}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            {ACTION_TYPES.map((at) => (
              <option key={at.value} value={at.value}>
                {at.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-600">
            {ACTION_TYPES.find((at) => at.value === actionType)?.description}
          </p>
        </div>
      </div>

      {/* Config fields */}
      <div className="flex flex-wrap gap-3">
        {(CONDITION_CONFIG_FIELDS[conditionType] || []).map((f) => (
          <div key={`c-${f.key}`}>
            <label className="mb-1 block text-xs text-gray-500">
              {f.label}
            </label>
            <input
              type={f.type}
              value={conditionConfig[f.key] ?? f.default}
              onChange={(e) =>
                setConditionConfig({
                  ...conditionConfig,
                  [f.key]:
                    f.type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
              className="w-32 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        ))}
        {(ACTION_CONFIG_FIELDS[actionType] || []).map((f) => (
          <div key={`a-${f.key}`} className={f.type === "text" ? "flex-1 min-w-48" : ""}>
            <label className="mb-1 block text-xs text-gray-500">
              {f.label}
            </label>
            <input
              type={f.type}
              value={actionConfig[f.key] ?? f.default}
              onChange={(e) =>
                setActionConfig({
                  ...actionConfig,
                  [f.key]: e.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            Cooldown (min)
          </label>
          <input
            type="number"
            value={cooldown}
            onChange={(e) => setCooldown(Number(e.target.value))}
            className="w-28 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || createRule.isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {createRule.isPending ? "Creating..." : "Create Rule"}
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Rule Card ─── */
function RuleCard({ rule }: { rule: AutomationRule }) {
  const updateRule = useUpdateAutomationRule();
  const deleteRule = useDeleteAutomationRule();
  const [expanded, setExpanded] = useState(false);

  const condLabel =
    CONDITION_TYPES.find((c) => c.value === rule.condition_type)?.label ||
    rule.condition_type;
  const actLabel =
    ACTION_TYPES.find((a) => a.value === rule.action_type)?.label ||
    rule.action_type;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{rule.name}</p>
            <span className="rounded bg-blue-900/40 px-2 py-0.5 text-xs text-blue-400">
              {condLabel}
            </span>
            <span className="text-gray-600">&rarr;</span>
            <span className="rounded bg-purple-900/40 px-2 py-0.5 text-xs text-purple-400">
              {actLabel}
            </span>
            {rule.recent_executions > 0 && (
              <span className="rounded-full bg-amber-900/40 px-2 py-0.5 text-xs text-amber-400">
                {rule.recent_executions} exec (24h)
              </span>
            )}
          </div>
          {rule.description && (
            <p className="mt-1 text-xs text-gray-500">{rule.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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

      {expanded && (
        <div className="mt-3 border-t border-gray-800 pt-3 text-sm text-gray-400 space-y-1">
          <p>
            <span className="text-gray-500">Condition Config:</span>{" "}
            {JSON.stringify(rule.condition_config)}
          </p>
          <p>
            <span className="text-gray-500">Action Config:</span>{" "}
            {Object.keys(rule.action_config).length > 0
              ? JSON.stringify(rule.action_config)
              : "—"}
          </p>
          <p>
            <span className="text-gray-500">Cooldown:</span>{" "}
            {rule.cooldown_minutes} minutes
          </p>
          <p>
            <span className="text-gray-500">Created:</span>{" "}
            {new Date(rule.created_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── History Section ─── */
function HistorySection() {
  const [page, setPage] = useState(1);
  const [filterSuccess, setFilterSuccess] = useState<boolean | undefined>(
    undefined
  );
  const { data: history } = useAutomationHistory(
    page,
    undefined,
    filterSuccess
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Execution History</h2>
        <div className="flex gap-2">
          {(
            [
              [undefined, "All"],
              [true, "Success"],
              [false, "Failed"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={label}
              onClick={() => {
                setFilterSuccess(val as boolean | undefined);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${
                filterSuccess === val
                  ? "bg-brand-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!history || history.items.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
          No automation history yet. Rules execute every 5 minutes when enabled.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/60 text-left text-xs text-gray-500">
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {history.items.map((entry) => (
                  <tr key={entry.id} className="bg-gray-900">
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                      {new Date(entry.executed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-purple-900/40 px-2 py-0.5 text-xs text-purple-400">
                        {ACTION_TYPES.find((a) => a.value === entry.action_taken)
                          ?.label || entry.action_taken}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-300">
                      {entry.target_username || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {entry.success ? (
                        <span className="rounded bg-green-900/40 px-2 py-0.5 text-xs text-green-400">
                          Success
                        </span>
                      ) : (
                        <span
                          className="rounded bg-red-900/40 px-2 py-0.5 text-xs text-red-400"
                          title={entry.error_message || ""}
                        >
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">
                      {entry.context
                        ? Object.entries(entry.context)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {history.total > history.page_size && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {(history.page - 1) * history.page_size + 1}&ndash;
                {Math.min(history.page * history.page_size, history.total)} of{" "}
                {history.total}
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
                  disabled={history.page * history.page_size >= history.total}
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
  );
}

/* ─── Main Page ─── */
export default function Automation() {
  const { data: rules } = useAutomationRules();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automation</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create rules that automatically respond to user behavior. Rules are
            evaluated every 5 minutes.
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            New Rule
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && <CreateRuleForm onClose={() => setShowCreate(false)} />}

      {/* Rules list */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Rules{" "}
          {rules && (
            <span className="text-sm font-normal text-gray-500">
              ({rules.length})
            </span>
          )}
        </h2>
        {!rules || rules.length === 0 ? (
          <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
            No automation rules configured. Create one to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <HistorySection />
    </div>
  );
}
