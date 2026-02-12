import { useQuery } from "@tanstack/react-query";
import { fetchAllServerHealth, fetchServerHealth } from "../api/serverHealth";

export function useAllServerHealth() {
  return useQuery({
    queryKey: ["server-health"],
    queryFn: fetchAllServerHealth,
    refetchInterval: 30_000, // refresh every 30s
  });
}

export function useServerHealth(serverId?: string) {
  return useQuery({
    queryKey: ["server-health", serverId],
    queryFn: () => fetchServerHealth(serverId!),
    enabled: !!serverId,
    refetchInterval: 15_000,
  });
}
