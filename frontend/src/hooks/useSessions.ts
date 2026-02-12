import { useQuery } from "@tanstack/react-query";
import { getActiveSessions, getSessionHistory } from "../api/sessions";

export function useActiveSessions() {
  return useQuery({
    queryKey: ["sessions", "active"],
    queryFn: getActiveSessions,
    refetchInterval: 5_000,
  });
}

export function useSessionHistory(page = 1, pageSize = 25) {
  return useQuery({
    queryKey: ["sessions", "history", page, pageSize],
    queryFn: () => getSessionHistory({ page, page_size: pageSize }),
  });
}
