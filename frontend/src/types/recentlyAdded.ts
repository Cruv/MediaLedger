export interface RecentlyAddedItem {
  id: string;
  title: string;
  item_type: string;
  year?: number;
  season_number?: number;
  episode_number?: number;
  runtime_ticks?: number;
  added_at?: string;
  genres?: string[];
  thumb_url?: string;
  library_name: string;
  server_name: string;
}

export interface RecentlyAddedResponse {
  items: RecentlyAddedItem[];
  total: number;
  days: number;
}

export interface NewsletterPreview {
  html: string;
  item_count: number;
  period_days: number;
}
