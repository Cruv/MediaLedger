export interface MediaRequest {
  id: string;
  title: string;
  item_type: string;
  year?: number;
  imdb_id?: string;
  tmdb_id?: number;
  tvdb_id?: number;
  status: string;
  source: string;
  external_request_id?: string;
  requested_by_username?: string;
  requested_at: string;
  fulfilled_at?: string;
  fulfilled_item_title?: string;
  first_watched_at?: string;
  first_watched_by_username?: string;
  created_at: string;
}

export interface PaginatedRequests {
  items: MediaRequest[];
  total: number;
  page: number;
  page_size: number;
}

export interface RequestStats {
  total_requests: number;
  pending: number;
  approved: number;
  available: number;
  watched: number;
  partially_watched: number;
  declined: number;
  never_watched: number;
  avg_days_to_watch?: number;
}

export interface RequestCreate {
  title: string;
  item_type?: string;
  year?: number;
  imdb_id?: string;
  tmdb_id?: number;
  tvdb_id?: number;
  requested_by_user_id?: string;
  source?: string;
}
