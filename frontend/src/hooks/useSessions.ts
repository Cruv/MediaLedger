import { useQuery } from "@tanstack/react-query";
import { getActiveSessions, getSessionHistory, getSessionStats } from "../api/sessions";
import type { SessionHistoryFilters } from "../api/sessions";

export function useActiveSessions() {
  return useQuery({
    queryKey: ["sessions", "active"],
    queryFn: getActiveSessions,
    refetchInterval: 5_000,
  });
}

export function useSessionHistory(filters: SessionHistoryFilters = {}) {
  return useQuery({
    queryKey: ["sessions", "history", filters],
    queryFn: () => getSessionHistory(filters),
  });
}

export function useSessionStats(filters: Omit<SessionHistoryFilters, "page" | "page_size"> = {}) {
  return useQuery({
    queryKey: ["sessions", "history", "stats", filters],
    queryFn: () => getSessionStats(filters),
  });
}
