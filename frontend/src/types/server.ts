export interface Server {
  id: string;
  name: string;
  server_type: "emby" | "jellyfin";
  base_url: string;
  is_active: boolean;
  poll_interval_sec: number;
  server_id?: string;
  server_version?: string;
  last_seen_at?: string;
  created_at: string;
}

export interface ServerCreate {
  name: string;
  server_type: "emby" | "jellyfin";
  base_url: string;
  api_key: string;
  poll_interval_sec?: number;
}

export interface ServerTestResult {
  success: boolean;
  server_name?: string;
  server_id?: string;
  version?: string;
  error?: string;
}
