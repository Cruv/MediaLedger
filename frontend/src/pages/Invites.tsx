import { useState } from "react";
import {
  useTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useCodes,
  useGenerateCode,
  useRevokeCode,
  useRedemptions,
  useRedeemInvite,
} from "../hooks/useInvites";
import type { InviteTemplate, InviteCode as ICode } from "../types/invites";

/* ─── Create Template Form ─── */
function CreateTemplateForm({ onDone }: { onDone: () => void }) {
  const createMut = useCreateTemplate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serverIds, setServerIds] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [autoTags, setAutoTags] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createMut.mutateAsync({
      name,
      description: description || undefined,
      server_ids: serverIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      expiry_days: expiryDays ? parseInt(expiryDays) : undefined,
      auto_tags: autoTags
        ? autoTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    });
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-gray-800 bg-gray-900 p-4"
    >
      <h3 className="text-sm font-semibold">New Template</h3>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name"
        required
        className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500"
      />
      <input
        value={serverIds}
        onChange={(e) => setServerIds(e.target.value)}
        placeholder="Server IDs (comma separated)"
        className="w-full rounded bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          value={expiryDays}
          onChange={(e) => setExpiryDays(e.target.value)}
          placeholder="Expiry days (optional)"
          type="number"
          className="rounded bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500"
        />
        <input
          value={autoTags}
          onChange={(e) => setAutoTags(e.target.value)}
          placeholder="Auto tags (comma sep)"
          className="rounded bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createMut.isPending}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {createMut.isPending ? "Creating..." : "Create Template"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-gray-700 px-4 py-1.5 text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ─── Template Card ─── */
function TemplateCard({
  template,
  onSelect,
  selected,
}: {
  template: InviteTemplate;
  onSelect: () => void;
  selected: boolean;
}) {
  const deleteMut = useDeleteTemplate();

  return (
    <div
      className={`rounded-lg border p-4 ${
        selected
          ? "border-brand-500 bg-brand-600/10"
          : "border-gray-800 bg-gray-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <button onClick={onSelect} className="text-left flex-1">
          <h4 className="font-semibold">{template.name}</h4>
          {template.description && (
            <p className="text-xs text-gray-500 mt-1">{template.description}</p>
          )}
        </button>
        <button
          onClick={() => deleteMut.mutate(template.id)}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Delete
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-gray-800 px-2 py-0.5 text-gray-400">
          {template.server_ids.length} server(s)
        </span>
        {template.expiry_days && (
          <span className="rounded bg-orange-900/50 px-2 py-0.5 text-orange-400">
            {template.expiry_days}d expiry
          </span>
        )}
        {template.auto_tags &&
          template.auto_tags.map((t) => (
            <span
              key={t}
              className="rounded bg-brand-900/50 px-2 py-0.5 text-brand-400"
            >
              {t}
            </span>
          ))}
      </div>
    </div>
  );
}

/* ─── Code Manager ─── */
function CodeManager({ templateId }: { templateId: string }) {
  const { data: codes } = useCodes(templateId);
  const generateMut = useGenerateCode();
  const revokeMut = useRevokeCode();
  const [maxUses, setMaxUses] = useState("1");
  const [expiresHours, setExpiresHours] = useState("");

  function handleGenerate() {
    generateMut.mutate({
      template_id: templateId,
      max_uses: parseInt(maxUses) || 1,
      expires_in_hours: expiresHours ? parseInt(expiresHours) : undefined,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-gray-500">Max Uses</label>
          <input
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            type="number"
            min={1}
            className="block w-20 rounded bg-gray-800 px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Expires (hours)</label>
          <input
            value={expiresHours}
            onChange={(e) => setExpiresHours(e.target.value)}
            type="number"
            placeholder="∞"
            className="block w-20 rounded bg-gray-800 px-2 py-1.5 text-sm text-white placeholder-gray-600"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generateMut.isPending}
          className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          Generate Code
        </button>
      </div>

      {/* Code list */}
      {codes && codes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Uses</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Expires</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {codes.map((c: ICode) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-mono text-brand-400">{c.code}</td>
                  <td className="px-4 py-2 text-gray-400">
                    {c.times_used}/{c.max_uses}
                  </td>
                  <td className="px-4 py-2">
                    {c.is_active ? (
                      <span className="text-green-400">Active</span>
                    ) : (
                      <span className="text-red-400">Revoked</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {c.expires_at
                      ? new Date(c.expires_at).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-2">
                    {c.is_active && (
                      <button
                        onClick={() => revokeMut.mutate(c.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Revoke
                      </button>
                    )}
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

/* ─── Quick Redeem Panel ─── */
function RedeemPanel() {
  const redeemMut = useRedeemInvite();
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    await redeemMut.mutateAsync({ code, username, password });
    setCode("");
    setUsername("");
    setPassword("");
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h3 className="text-sm font-semibold mb-3">Quick Redeem</h3>
      <form onSubmit={handleRedeem} className="flex flex-wrap gap-2 items-end">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Invite code"
          required
          className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500"
        />
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          required
          className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={redeemMut.isPending}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {redeemMut.isPending ? "Provisioning..." : "Redeem"}
        </button>
      </form>
      {redeemMut.isSuccess && redeemMut.data && (
        <div className="mt-3 text-sm">
          <p className="text-green-400">
            Created <strong>{redeemMut.data.username}</strong> on{" "}
            {redeemMut.data.servers_provisioned.length} server(s)
          </p>
          {redeemMut.data.expiry_days && (
            <p className="text-gray-500">
              Access expires in {redeemMut.data.expiry_days} days
            </p>
          )}
          {redeemMut.data.errors.length > 0 && (
            <p className="text-red-400">Errors: {redeemMut.data.errors.join(", ")}</p>
          )}
        </div>
      )}
      {redeemMut.isError && (
        <p className="mt-2 text-sm text-red-400">
          {(redeemMut.error as Error).message || "Failed to redeem"}
        </p>
      )}
    </div>
  );
}

/* ─── Redemption History ─── */
function RedemptionHistory() {
  const { data } = useRedemptions();

  if (!data || data.items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 px-4 py-3">
        <h3 className="text-sm font-semibold">Redemption History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
              <th className="px-4 py-2 font-medium">Username</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Servers</th>
              <th className="px-4 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data.items.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-gray-300">{r.username}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      r.status === "success"
                        ? "text-green-400"
                        : "text-yellow-400"
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {r.servers_provisioned.length}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {new Date(r.redeemed_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function Invites() {
  const { data: templates } = useTemplates();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTmpl, setSelectedTmpl] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invite Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create templates with access policies, generate invite codes, and
            auto-provision users on your servers.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          {showCreate ? "Cancel" : "New Template"}
        </button>
      </div>

      {showCreate && (
        <CreateTemplateForm onDone={() => setShowCreate(false)} />
      )}

      {/* Templates */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={selectedTmpl === t.id}
            onSelect={() => setSelectedTmpl(t.id === selectedTmpl ? null : t.id)}
          />
        ))}
      </div>

      {/* Code manager for selected template */}
      {selectedTmpl && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="mb-3 text-sm font-semibold">
            Invite Codes for{" "}
            {templates?.find((t) => t.id === selectedTmpl)?.name}
          </h3>
          <CodeManager templateId={selectedTmpl} />
        </div>
      )}

      {/* Quick redeem */}
      <RedeemPanel />

      {/* Redemption history */}
      <RedemptionHistory />
    </div>
  );
}
