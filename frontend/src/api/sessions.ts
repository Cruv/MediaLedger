import apiClient from "./client";
import type { ActiveSession, PaginatedSessionHistory } from "../types/session";

export async function getActiveSessions(): Promise<ActiveSession[]> {
  const { data } = await apiClient.get<ActiveSession[]>("/sessions/active");
  return data;
}

export async function getSessionHistory(params?: {
  page?: number;
  page_size?: number;
  completed_only?: boolean;
}): Promise<PaginatedSessionHistory> {
  const { data } = await apiClient.get<PaginatedSessionHistory>(
    "/sessions/history",
    { params }
  );
  return data;
}
