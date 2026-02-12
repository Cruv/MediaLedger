import apiClient from "./client";
import type { NewsletterPreview, RecentlyAddedResponse } from "../types/recentlyAdded";

export async function fetchRecentlyAdded(params?: {
  days?: number;
  server_id?: string;
  library_type?: string;
  limit?: number;
}): Promise<RecentlyAddedResponse> {
  const { data } = await apiClient.get("/recently-added", { params });
  return data;
}

export async function fetchNewsletterPreview(params?: {
  days?: number;
  server_id?: string;
}): Promise<NewsletterPreview> {
  const { data } = await apiClient.get("/recently-added/newsletter", { params });
  return data;
}

export async function sendNewsletter(params?: {
  days?: number;
  server_id?: string;
}): Promise<{ message: string; item_count: number }> {
  const { data } = await apiClient.post("/recently-added/newsletter/send", null, { params });
  return data;
}
