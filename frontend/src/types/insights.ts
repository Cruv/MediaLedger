export interface UnwatchedItem {
  id: string;
  title: string;
  type: string;
  year: number | null;
  added_at: string | null;
  runtime_hours: number | null;
  genres: string[];
  library: string;
  server: string;
}

export interface UnwatchedResponse {
  items: UnwatchedItem[];
  total: number;
}

export interface CompletionByType {
  type: string;
  total_plays: number;
  completed: number;
  completion_rate: number;
  avg_watched_pct: number;
}

export interface DroppedContent {
  title: string;
  type: string;
  total_plays: number;
  completed: number;
  completion_rate: number;
  avg_watched_pct: number;
}

export interface CompletionRatesResponse {
  by_type: CompletionByType[];
  most_dropped: DroppedContent[];
}

export interface PopularItem {
  title: string;
  type: string;
  plays: number;
  unique_viewers: number;
  total_hours: number;
  avg_watched_pct: number;
}

export interface PopularityResponse {
  items: PopularItem[];
  period_days: number;
}

export interface LibraryStat {
  library_id: string;
  name: string;
  type: string;
  server: string;
  total_items: number;
  watched_items: number;
  unwatched_items: number;
  watched_pct: number;
  total_runtime_hours: number;
}
