import type { UserTagBrief } from "./tags";

export interface User {
  id: string;
  server_id: string;
  remote_user_id: string;
  username: string;
  is_admin: boolean;
  is_disabled: boolean;
  last_login_at?: string;
  last_activity_at?: string;
  server_name?: string;
  server_type?: string;
  total_plays?: number;
  total_watch_time_sec?: number;
  tags: UserTagBrief[];
  expires_at?: string;
  subscription_status?: string;
  invite_code_id?: string;
}

export interface UserDevice {
  device_name?: string;
  device_id?: string;
  client_name?: string;
  last_seen_at?: string;
  session_count: number;
}

export interface UserSessionSummary {
  id: string;
  item_title?: string;
  item_type?: string;
  started_at: string;
  stopped_at: string;
  watched_pct: number;
  completed: boolean;
  device_name?: string;
}

export interface UserDetail extends User {
  devices: UserDevice[];
  recent_sessions: UserSessionSummary[];
}

export interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  page_size: number;
}
