import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmCorrelation,
  dismissCorrelation,
  fetchAnalysisStatus,
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

export function useAnalysisStatus(enabled: boolean) {
  return useQuery({
    queryKey: ["sharing-analysis-status"],
    queryFn: fetchAnalysisStatus,
    enabled,
    refetchInterval: enabled ? 2000 : false,
  });
}

export function useTriggerAnalysis() {
  return useMutation({
    mutationFn: triggerAnalysis,
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
