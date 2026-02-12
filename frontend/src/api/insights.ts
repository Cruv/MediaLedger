import apiClient from "./client";
import type {
  UnwatchedResponse,
  CompletionRatesResponse,
  PopularityResponse,
  LibraryStat,
} from "../types/insights";

export async function fetchUnwatched(params?: {
  library_type?: string;
  server_id?: string;
  days_since_added?: number;
  limit?: number;
}): Promise<UnwatchedResponse> {
  const { data } = await apiClient.get<UnwatchedResponse>("/insights/unwatched", { params });
  return data;
}

export async function fetchCompletionRates(params?: {
  days?: number;
  server_id?: string;
}): Promise<CompletionRatesResponse> {
  const { data } = await apiClient.get<CompletionRatesResponse>("/insights/completion-rates", { params });
  return data;
}

export async function fetchPopularity(params?: {
  days?: number;
  server_id?: string;
  limit?: number;
}): Promise<PopularityResponse> {
  const { data } = await apiClient.get<PopularityResponse>("/insights/popularity", { params });
  return data;
}

export async function fetchLibraryStats(): Promise<LibraryStat[]> {
  const { data } = await apiClient.get<LibraryStat[]>("/insights/library-stats");
  return data;
}
