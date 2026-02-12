import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSharingDetail, fetchSharingOverview, triggerAnalysis } from "../api/sharing";

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
    },
  });
}
