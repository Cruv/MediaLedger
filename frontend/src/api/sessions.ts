import apiClient from "./client";
import type { ActiveSession, PaginatedSessionHistory, SessionStats } from "../types/session";

export interface SessionHistoryFilters {
  page?: number;
  page_size?: number;
  server_id?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  completed_only?: boolean;
  item_type?: string;
  search?: string;
}

export async function getActiveSessions(): Promise<ActiveSession[]> {
  const { data } = await apiClient.get<ActiveSession[]>("/sessions/active");
  return data;
}

export async function getSessionHistory(params?: SessionHistoryFilters): Promise<PaginatedSessionHistory> {
  const { data } = await apiClient.get<PaginatedSessionHistory>(
    "/sessions/history",
    { params }
  );
  return data;
}

export async function getSessionStats(params?: Omit<SessionHistoryFilters, "page" | "page_size">): Promise<SessionStats> {
  const { data } = await apiClient.get<SessionStats>(
    "/sessions/history/stats",
    { params }
  );
  return data;
}

export function getExportUrl(params?: Omit<SessionHistoryFilters, "page" | "page_size">): string {
  const baseUrl = apiClient.defaults.baseURL || "/api";
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== false) {
        searchParams.set(key, String(value));
      }
    });
  }
  const qs = searchParams.toString();
  return `${baseUrl}/sessions/history/export${qs ? `?${qs}` : ""}`;
}
