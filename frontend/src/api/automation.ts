import apiClient from "./client";
import type { AutomationRule, PaginatedAutomationHistory } from "../types/automation";

export async function listRules(): Promise<AutomationRule[]> {
  const { data } = await apiClient.get<AutomationRule[]>("/automation/rules");
  return data;
}

export async function createRule(body: {
  name: string;
  description?: string;
  condition_type: string;
  condition_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  is_enabled?: boolean;
  cooldown_minutes?: number;
}): Promise<AutomationRule> {
  const { data } = await apiClient.post<AutomationRule>("/automation/rules", body);
  return data;
}

export async function updateRule(
  id: string,
  body: Partial<{
    name: string;
    description: string;
    condition_config: Record<string, unknown>;
    action_config: Record<string, unknown>;
    is_enabled: boolean;
    cooldown_minutes: number;
  }>
): Promise<AutomationRule> {
  const { data } = await apiClient.patch<AutomationRule>(`/automation/rules/${id}`, body);
  return data;
}

export async function deleteRule(id: string): Promise<void> {
  await apiClient.delete(`/automation/rules/${id}`);
}

export async function listHistory(params?: {
  rule_id?: string;
  success?: boolean;
  page?: number;
  page_size?: number;
}): Promise<PaginatedAutomationHistory> {
  const { data } = await apiClient.get<PaginatedAutomationHistory>("/automation/history", { params });
  return data;
}
