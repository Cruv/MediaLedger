export interface SharingScore {
  user_id: string;
  username: string;
  server_name: string;
  overall_score: number;
  ip_diversity_score: number;
  concurrency_score: number;
  pattern_score: number;
  device_score: number;
  cross_server_score: number;
  severity: "low" | "moderate" | "high" | "critical";
  analysis_window_start: string;
  analysis_window_end: string;
  computed_at: string;
}

export interface SharingScoreDetail extends SharingScore {
  evidence?: Record<string, unknown>;
}

export interface SharingOverview {
  total_users_analyzed: number;
  critical_count: number;
  high_count: number;
  moderate_count: number;
  low_count: number;
  scores: SharingScore[];
}
