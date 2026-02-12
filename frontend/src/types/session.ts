export interface ActiveSession {
  id: string;
  server_id: string;
  user_id: string;
  item_id?: string;
  remote_session_id: string;
  state: "playing" | "paused" | "buffering";
  play_method?: string;
  device_name?: string;
  device_id?: string;
  client_name?: string;
  ip_address?: string;
  position_ticks: number;
  runtime_ticks?: number;
  started_at: string;
  last_activity_at: string;
  username?: string;
  item_title?: string;
  item_type?: string;
  series_name?: string;
  season_number?: number;
  episode_number?: number;
  server_name?: string;
}

export interface SessionHistory {
  id: string;
  server_id: string;
  user_id: string;
  item_title?: string;
  item_type?: string;
  item_year?: number;
  parent_title?: string;
  grandparent_title?: string;
  season_number?: number;
  episode_number?: number;
  play_method?: string;
  device_name?: string;
  client_name?: string;
  ip_address?: string;
  started_at: string;
  stopped_at: string;
  play_duration_sec: number;
  watched_pct: number;
  completed: boolean;
  username?: string;
  server_name?: string;
}

export interface PaginatedSessionHistory {
  items: SessionHistory[];
  total: number;
  page: number;
  page_size: number;
}

export interface SessionStats {
  total_sessions: number;
  completed_sessions: number;
  total_watch_time_sec: number;
  avg_watched_pct: number;
  unique_users: number;
}
