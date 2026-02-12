import type { ActiveSession, SessionHistory } from "./session";

export interface ServerStatus {
  id: string;
  name: string;
  server_type: string;
  is_active: boolean;
  last_seen_at?: string;
  online: boolean;
}

export interface TopUser {
  user_id: string;
  username: string;
  server_name: string;
  play_count: number;
  total_watch_time_sec: number;
}

export interface LibrarySummary {
  total_libraries: number;
  total_items: number;
  watched_items: number;
  unwatched_items: number;
}

export interface RequestSummary {
  total: number;
  pending: number;
  available: number;
  watched: number;
  never_watched: number;
}

export interface DashboardData {
  active_streams: ActiveSession[];
  server_statuses: ServerStatus[];
  recent_activity: SessionHistory[];
  top_users_7d: TopUser[];
  library_summary: LibrarySummary;
  request_summary: RequestSummary;
  total_streams: number;
  total_servers: number;
}
