export interface InviteTemplate {
  id: string;
  name: string;
  description: string | null;
  server_ids: string[];
  library_ids: string[] | null;
  policy_overrides: Record<string, unknown> | null;
  auto_tags: string[] | null;
  expiry_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface InviteCode {
  id: string;
  code: string;
  template_id: string;
  max_uses: number;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface InviteRedemption {
  id: string;
  invite_code_id: string;
  username: string;
  servers_provisioned: string[];
  status: string;
  error_message: string | null;
  redeemed_at: string;
}

export interface RedemptionResponse {
  items: InviteRedemption[];
  total: number;
}

export interface RedeemResult {
  username: string;
  servers_provisioned: string[];
  errors: string[];
  expiry_days: number | null;
}
