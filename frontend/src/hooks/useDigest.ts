import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchDigestPreview, sendDigest } from "../api/digest";

export function useDigestPreview(days?: number) {
  return useQuery({
    queryKey: ["digest", "preview", days],
    queryFn: () => fetchDigestPreview(days),
    enabled: false, // only fetch on demand
  });
}

export function useSendDigest() {
  return useMutation({
    mutationFn: sendDigest,
  });
}
