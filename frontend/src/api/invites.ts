import apiClient from "./client";
import type {
  InviteTemplate,
  InviteCode,
  RedemptionResponse,
  RedeemResult,
} from "../types/invites";

// ── Templates ──
export async function fetchTemplates(): Promise<InviteTemplate[]> {
  const { data } = await apiClient.get<InviteTemplate[]>("/invites/templates");
  return data;
}

export async function createTemplate(body: {
  name: string;
  description?: string;
  server_ids: string[];
  library_ids?: string[];
  policy_overrides?: Record<string, unknown>;
  auto_tags?: string[];
  expiry_days?: number;
}): Promise<InviteTemplate> {
  const { data } = await apiClient.post<InviteTemplate>("/invites/templates", body);
  return data;
}

export async function updateTemplate(
  id: string,
  body: Partial<{
    name: string;
    description: string;
    server_ids: string[];
    library_ids: string[];
    policy_overrides: Record<string, unknown>;
    auto_tags: string[];
    expiry_days: number;
  }>,
): Promise<InviteTemplate> {
  const { data } = await apiClient.put<InviteTemplate>(`/invites/templates/${id}`, body);
  return data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/invites/templates/${id}`);
}

// ── Codes ──
export async function fetchCodes(templateId?: string): Promise<InviteCode[]> {
  const params = templateId ? { template_id: templateId } : {};
  const { data } = await apiClient.get<InviteCode[]>("/invites/codes", { params });
  return data;
}

export async function generateCode(body: {
  template_id: string;
  max_uses?: number;
  expires_in_hours?: number;
}): Promise<InviteCode> {
  const { data } = await apiClient.post<InviteCode>("/invites/codes", body);
  return data;
}

export async function revokeCode(codeId: string): Promise<void> {
  await apiClient.delete(`/invites/codes/${codeId}`);
}

// ── Redemptions ──
export async function fetchRedemptions(params?: {
  limit?: number;
  offset?: number;
}): Promise<RedemptionResponse> {
  const { data } = await apiClient.get<RedemptionResponse>("/invites/redemptions", { params });
  return data;
}

export async function redeemInvite(body: {
  code: string;
  username: string;
  password: string;
}): Promise<RedeemResult> {
  const { data } = await apiClient.post<RedeemResult>("/invites/redeem", body);
  return data;
}
