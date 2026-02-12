import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmCorrelation,
  dismissCorrelation,
  fetchConcurrentEvents,
  fetchCorrelations,
  fetchIPOverlaps,
  fetchSharingDetail,
  fetchSharingOverview,
  triggerAnalysis,
} from "../api/sharing";

export function useSharingOverview() {
  return useQuery({
    queryKey: ["sharing-overview"],
    queryFn: fetchSharingOverview,
  });
}

export function useSharingDetail(userId: string) {
  return useQuery({
    queryKey: ["sharing-detail", userId],
    queryFn: () => fetchSharingDetail(userId),
    enabled: !!userId,
  });
}

export function useTriggerAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerAnalysis,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sharing-overview"] });
      qc.invalidateQueries({ queryKey: ["sharing-correlations"] });
      qc.invalidateQueries({ queryKey: ["sharing-ip-overlaps"] });
      qc.invalidateQueries({ queryKey: ["sharing-concurrent-events"] });
    },
  });
}

export function useCorrelations() {
  return useQuery({
    queryKey: ["sharing-correlations"],
    queryFn: fetchCorrelations,
  });
}

export function useConfirmCorrelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: confirmCorrelation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sharing-correlations"] }),
  });
}

export function useDismissCorrelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dismissCorrelation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sharing-correlations"] }),
  });
}

export function useIPOverlaps() {
  return useQuery({
    queryKey: ["sharing-ip-overlaps"],
    queryFn: fetchIPOverlaps,
  });
}

export function useConcurrentEvents(userId?: string) {
  return useQuery({
    queryKey: ["sharing-concurrent-events", userId],
    queryFn: () => fetchConcurrentEvents(userId),
  });
}
