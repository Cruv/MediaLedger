import { useState } from "react";
import {
  useSubscriptions,
  useLinkStripe,
  useSyncSubscription,
  useUnlinkStripe,
} from "../hooks/useStripe";

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: string | null }) {
  const colors: Record<string, string> = {
    active: "bg-green-900/50 text-green-400",
    trialing: "bg-blue-900/50 text-blue-400",
    past_due: "bg-yellow-900/50 text-yellow-400",
    canceled: "bg-red-900/50 text-red-400",
    unpaid: "bg-red-900/50 text-red-400",
  };
  const cls = colors[status || ""] || "bg-gray-800 text-gray-400";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status || "unlinked"}
    </span>
  );
}

/* ─── Link Form ─── */
function LinkForm() {
  const linkMut = useLinkStripe();
  const [userId, setUserId] = useState("");
  const [customerId, setCustomerId] = useState("");

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    await linkMut.mutateAsync({ userId, customerId });
    setUserId("");
    setCustomerId("");
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-3 text-sm font-semibold">Link User to Stripe</h3>
      <form onSubmit={handleLink} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-gray-500">User ID</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="MediaLedger user ID"
            required
            className="block rounded bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Stripe Customer ID</label>
          <input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="cus_..."
            required
            className="block rounded bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500"
          />
        </div>
        <button
          type="submit"
          disabled={linkMut.isPending}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {linkMut.isPending ? "Linking..." : "Link"}
        </button>
      </form>
      {linkMut.isSuccess && linkMut.data && (
        <p className="mt-2 text-sm text-green-400">
          Linked {linkMut.data.username} to {linkMut.data.stripe_customer_id}
        </p>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function StripeBilling() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: subs, isLoading } = useSubscriptions(statusFilter || undefined);
  const syncMut = useSyncSubscription();
  const unlinkMut = useUnlinkStripe();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stripe Integration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Link Stripe customers to media server users. Subscriptions auto-enable/disable
          user access via webhooks.
        </p>
      </div>

      {/* Setup info */}
      <div className="rounded-lg border border-blue-800/50 bg-blue-900/20 p-4 text-sm">
        <h3 className="font-semibold text-blue-300 mb-1">Webhook Setup</h3>
        <p className="text-blue-200/70">
          Point your Stripe webhook to{" "}
          <code className="rounded bg-blue-900/50 px-1.5 py-0.5">
            https://your-domain/api/stripe/webhook
          </code>{" "}
          and enable these events:{" "}
          <code className="text-xs">
            customer.subscription.created, customer.subscription.updated,
            customer.subscription.deleted, invoice.payment_succeeded,
            invoice.payment_failed
          </code>
        </p>
        <p className="mt-1 text-blue-200/70">
          Set <code className="rounded bg-blue-900/50 px-1.5 py-0.5">STRIPE_API_KEY</code>{" "}
          and <code className="rounded bg-blue-900/50 px-1.5 py-0.5">STRIPE_WEBHOOK_SECRET</code>{" "}
          environment variables.
        </p>
      </div>

      {/* Link form */}
      <LinkForm />

      {/* Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-400">Filter:</label>
        {["", "active", "past_due", "canceled", "trialing"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1 text-sm font-medium ${
              statusFilter === s
                ? "bg-brand-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Subscriptions table */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : subs && subs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-4 py-2 font-medium">Username</th>
                <th className="px-4 py-2 font-medium">Customer ID</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Disabled</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {subs.map((sub) => (
                <tr key={sub.user_id}>
                  <td className="px-4 py-2 text-gray-300">{sub.username}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {sub.stripe_customer_id}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={sub.subscription_status} />
                  </td>
                  <td className="px-4 py-2">
                    {sub.is_disabled ? (
                      <span className="text-red-400">Yes</span>
                    ) : (
                      <span className="text-green-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => syncMut.mutate(sub.stripe_customer_id!)}
                        disabled={syncMut.isPending}
                        className="text-xs text-brand-400 hover:text-brand-300"
                      >
                        Sync
                      </button>
                      <button
                        onClick={() => unlinkMut.mutate(sub.user_id)}
                        disabled={unlinkMut.isPending}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Unlink
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-500">
            {statusFilter
              ? `No subscriptions with status "${statusFilter}".`
              : "No users linked to Stripe yet. Use the form above to link a user."}
          </p>
        </div>
      )}

      {syncMut.isSuccess && syncMut.data && (
        <p className="text-sm text-green-400">
          Synced: status is now "{syncMut.data.status}"
        </p>
      )}
    </div>
  );
}
