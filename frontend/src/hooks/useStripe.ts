import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSubscriptions,
  linkStripeCustomer,
  syncSubscription,
  unlinkStripe,
} from "../api/stripe";

export function useSubscriptions(status?: string) {
  return useQuery({
    queryKey: ["stripe", "subscriptions", status],
    queryFn: () => fetchSubscriptions(status),
  });
}

export function useLinkStripe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, customerId }: { userId: string; customerId: string }) =>
      linkStripeCustomer(userId, customerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stripe"] }),
  });
}

export function useSyncSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncSubscription,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stripe"] }),
  });
}

export function useUnlinkStripe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unlinkStripe,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stripe"] }),
  });
}
