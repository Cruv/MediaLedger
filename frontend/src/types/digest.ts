export interface TopWatcher {
  username: string;
  hours: number;
  sessions: number;
}

export interface TopContent {
  title: string;
  subtitle?: string | null;
  type: string | null;
  plays: number;
}

export interface ServerInfo {
  name: string;
  type: string;
  last_seen: string | null;
}

export interface DigestStats {
  period_days: number;
  generated_at: string;
  active_users: number;
  total_users: number;
  total_sessions: number;
  total_watch_hours: number;
  new_library_items: number;
  top_watchers: TopWatcher[];
  top_content: TopContent[];
  servers: ServerInfo[];
  alerts_triggered: number;
  alerts_unresolved: number;
  automation_executions: number;
  automation_failures: number;
  high_sharing_users: number;
}

export interface DigestPreview {
  html: string;
  stats: DigestStats;
}
