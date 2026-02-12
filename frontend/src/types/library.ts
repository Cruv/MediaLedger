export interface Library {
  id: string;
  server_id: string;
  remote_library_id: string;
  name: string;
  library_type: string;
  item_count: number;
  is_active: boolean;
  last_synced_at?: string;
  server_name?: string;
  total_items?: number;
  watched_items?: number;
  unwatched_items?: number;
}

export interface LibraryItem {
  id: string;
  library_id: string;
  server_id: string;
  remote_item_id: string;
  title: string;
  item_type: string;
  year?: number;
  season_number?: number;
  episode_number?: number;
  runtime_ticks?: number;
  added_at?: string;
  premiere_date?: string;
  genres?: string[];
  imdb_id?: string;
  tmdb_id?: number;
  global_play_count: number;
  global_last_played_at?: string;
}

export interface PaginatedLibraryItems {
  items: LibraryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface LibraryStats {
  total_libraries: number;
  total_items: number;
  total_movies: number;
  total_episodes: number;
  total_plays: number;
}
