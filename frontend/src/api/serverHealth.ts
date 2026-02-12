import apiClient from "./client";
import type { ServerHealthSummary, ServerHealthDetail } from "../types/serverHealth";

export async function fetchAllServerHealth(): Promise<ServerHealthSummary[]> {
  const { data } = await apiClient.get<ServerHealthSummary[]>("/server-health");
  return data;
}

export async function fetchServerHealth(serverId: string): Promise<ServerHealthDetail> {
  const { data } = await apiClient.get<ServerHealthDetail>(`/server-health/${serverId}`);
  return data;
}
