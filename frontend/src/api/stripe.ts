import apiClient from "./client";
import type { StripeSubscription, LinkResult, SyncResult } from "../types/stripe";

export async function fetchSubscriptions(status?: string): Promise<StripeSubscription[]> {
  const params = status ? { status } : {};
  const { data } = await apiClient.get<StripeSubscription[]>("/stripe/subscriptions", { params });
  return data;
}

export async function linkStripeCustomer(userId: string, stripeCustomerId: string): Promise<LinkResult> {
  const { data } = await apiClient.post<LinkResult>("/stripe/link", {
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
  });
  return data;
}

export async function syncSubscription(stripeCustomerId: string): Promise<SyncResult> {
  const { data } = await apiClient.post<SyncResult>(`/stripe/sync/${stripeCustomerId}`);
  return data;
}

export async function unlinkStripe(userId: string): Promise<void> {
  await apiClient.delete(`/stripe/unlink/${userId}`);
}
