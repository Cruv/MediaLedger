import apiClient from "./client";
import type {
  DailyPlayCount,
  DailyPlayDuration,
  HourlyActivity,
  TopContent,
  PlatformBreakdown,
  PlayMethodBreakdown,
  TopUser,
} from "../types/graphs";

interface GraphParams {
  days?: number;
  server_id?: string;
}

export async function getDailyPlays(params?: GraphParams): Promise<DailyPlayCount[]> {
  const { data } = await apiClient.get<DailyPlayCount[]>("/graphs/daily-plays", { params });
  return data;
}

export async function getDailyDuration(params?: GraphParams): Promise<DailyPlayDuration[]> {
  const { data } = await apiClient.get<DailyPlayDuration[]>("/graphs/daily-duration", { params });
  return data;
}

export async function getHourlyActivity(params?: GraphParams): Promise<HourlyActivity[]> {
  const { data } = await apiClient.get<HourlyActivity[]>("/graphs/hourly-activity", { params });
  return data;
}

export async function getTopContent(params?: GraphParams & { limit?: number }): Promise<TopContent[]> {
  const { data } = await apiClient.get<TopContent[]>("/graphs/top-content", { params });
  return data;
}

export async function getPlatforms(params?: GraphParams): Promise<PlatformBreakdown[]> {
  const { data } = await apiClient.get<PlatformBreakdown[]>("/graphs/platforms", { params });
  return data;
}

export async function getPlayMethods(params?: GraphParams): Promise<PlayMethodBreakdown[]> {
  const { data } = await apiClient.get<PlayMethodBreakdown[]>("/graphs/play-methods", { params });
  return data;
}

export async function getTopUsers(params?: GraphParams & { limit?: number }): Promise<TopUser[]> {
  const { data } = await apiClient.get<TopUser[]>("/graphs/top-users", { params });
  return data;
}
