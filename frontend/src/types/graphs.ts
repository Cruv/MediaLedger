export interface DailyPlayCount {
  date: string;
  plays: number;
  completed: number;
}

export interface DailyPlayDuration {
  date: string;
  duration_hours: number;
}

export interface HourlyActivity {
  hour: number;
  day_of_week: number;
  plays: number;
}

export interface TopContent {
  title: string;
  item_type: string;
  plays: number;
  total_duration_sec: number;
}

export interface PlatformBreakdown {
  platform: string;
  plays: number;
  total_duration_sec: number;
}

export interface PlayMethodBreakdown {
  play_method: string;
  plays: number;
}

export interface TopUser {
  user_id: string;
  username: string;
  plays: number;
  total_duration_sec: number;
}
