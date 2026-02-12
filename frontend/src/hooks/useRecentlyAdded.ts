import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchNewsletterPreview, fetchRecentlyAdded, sendNewsletter } from "../api/recentlyAdded";

export function useRecentlyAdded(params?: {
  days?: number;
  server_id?: string;
  library_type?: string;
}) {
  return useQuery({
    queryKey: ["recently-added", params],
    queryFn: () => fetchRecentlyAdded(params),
  });
}

export function useNewsletterPreview(params?: {
  days?: number;
  server_id?: string;
}) {
  return useQuery({
    queryKey: ["newsletter-preview", params],
    queryFn: () => fetchNewsletterPreview(params),
    enabled: false, // only fetch on demand
  });
}

export function useSendNewsletter() {
  return useMutation({
    mutationFn: sendNewsletter,
  });
}
