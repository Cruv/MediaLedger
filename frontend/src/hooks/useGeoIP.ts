import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMapData, fetchGeoStats, enrichIPs } from "../api/geoip";

export function useGeoMapData(userId?: string) {
  return useQuery({
    queryKey: ["geoip", "map-data", userId],
    queryFn: () => fetchMapData(userId),
  });
}

export function useGeoStats() {
  return useQuery({
    queryKey: ["geoip", "stats"],
    queryFn: fetchGeoStats,
  });
}

export function useEnrichIPs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: enrichIPs,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["geoip"] });
    },
  });
}
