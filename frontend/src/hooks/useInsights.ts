import { useQuery } from "@tanstack/react-query";
import {
  fetchUnwatched,
  fetchCompletionRates,
  fetchPopularity,
  fetchLibraryStats,
} from "../api/insights";

export function useUnwatched(params?: {
  library_type?: string;
  server_id?: string;
  days_since_added?: number;
}) {
  return useQuery({
    queryKey: ["insights", "unwatched", params],
    queryFn: () => fetchUnwatched(params),
  });
}

export function useCompletionRates(days?: number, serverId?: string) {
  return useQuery({
    queryKey: ["insights", "completion-rates", days, serverId],
    queryFn: () => fetchCompletionRates({ days, server_id: serverId }),
  });
}

export function usePopularity(days?: number, serverId?: string) {
  return useQuery({
    queryKey: ["insights", "popularity", days, serverId],
    queryFn: () => fetchPopularity({ days, server_id: serverId }),
  });
}

export function useLibraryStats() {
  return useQuery({
    queryKey: ["insights", "library-stats"],
    queryFn: fetchLibraryStats,
  });
}
