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

export interface Correlation {
  id: string;
  user_a_username: string;
  user_a_server: string;
  user_b_username: string;
  user_b_server: string;
  correlation_type: string;
  confidence_score: number;
  confirmed_by_admin: boolean;
}

export interface IPOverlap {
  user_a_username: string;
  user_b_username: string;
  shared_ips: number;
  shared_countries: string[];
}

export interface ConcurrentEvent {
  id: string;
  username: string;
  overlap_start: string;
  overlap_end: string;
  ip_a: string | null;
  ip_b: string | null;
  device_a: string | null;
  device_b: string | null;
  geo_distance_km: number | null;
  same_network: boolean;
}
