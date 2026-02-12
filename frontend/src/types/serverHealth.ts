export interface SystemInfo {
  server_name: string | null;
  version: string | null;
  os: string | null;
  architecture: string | null;
  has_pending_restart: boolean;
  can_self_restart: boolean;
  local_address: string | null;
  wan_address?: string | null;
  transcode_path?: string | null;
  log_path?: string | null;
  cache_path?: string | null;
  internal_metadata_path?: string | null;
}

export interface Last24h {
  sessions: number;
  watch_hours: number;
  transcode_sessions: number;
}

export interface ServerHealthSummary {
  server_id: string;
  name: string;
  type: string;
  base_url?: string;
  version: string | null;
  last_seen: string | null;
  is_online: boolean;
  system_info: SystemInfo | null;
  active_sessions: number;
  transcoding_sessions: number;
}

export interface ServerHealthDetail extends ServerHealthSummary {
  transcoding_now: number;
  direct_play_now: number;
  estimated_bandwidth_mbps: number;
  last_24h: Last24h;
}
