import apiClient from "./client";
import type { AlertRule, PaginatedAlertEvents } from "../types/alerts";

export async function listRules(): Promise<AlertRule[]> {
  const { data } = await apiClient.get<AlertRule[]>("/alerts/rules");
  return data;
}

export async function createRule(body: {
  name: string;
  condition_type: string;
  condition_config: Record<string, unknown>;
  is_enabled?: boolean;
  cooldown_minutes?: number;
}): Promise<AlertRule> {
  const { data } = await apiClient.post<AlertRule>("/alerts/rules", body);
  return data;
}

export async function updateRule(id: string, body: Partial<AlertRule>): Promise<AlertRule> {
  const { data } = await apiClient.patch<AlertRule>(`/alerts/rules/${id}`, body);
  return data;
}

export async function deleteRule(id: string): Promise<void> {
  await apiClient.delete(`/alerts/rules/${id}`);
}

export async function listEvents(params?: {
  resolved?: boolean;
  page?: number;
  page_size?: number;
}): Promise<PaginatedAlertEvents> {
  const { data } = await apiClient.get<PaginatedAlertEvents>("/alerts/events", { params });
  return data;
}

export async function resolveEvent(id: string): Promise<void> {
  await apiClient.post(`/alerts/events/${id}/resolve`);
}

export async function getUnresolvedCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>("/alerts/unresolved-count");
  return data.count;
}
