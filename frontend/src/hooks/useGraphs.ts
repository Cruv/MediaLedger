import { useQuery } from "@tanstack/react-query";
import {
  getDailyPlays,
  getDailyDuration,
  getHourlyActivity,
  getTopContent,
  getPlatforms,
  getPlayMethods,
  getTopUsers,
} from "../api/graphs";

interface GraphParams {
  days?: number;
  server_id?: string;
}

export function useDailyPlays(params: GraphParams = {}) {
  return useQuery({
    queryKey: ["graphs", "daily-plays", params],
    queryFn: () => getDailyPlays(params),
  });
}

export function useDailyDuration(params: GraphParams = {}) {
  return useQuery({
    queryKey: ["graphs", "daily-duration", params],
    queryFn: () => getDailyDuration(params),
  });
}

export function useHourlyActivity(params: GraphParams = {}) {
  return useQuery({
    queryKey: ["graphs", "hourly-activity", params],
    queryFn: () => getHourlyActivity(params),
  });
}

export function useTopContent(params: GraphParams & { limit?: number } = {}) {
  return useQuery({
    queryKey: ["graphs", "top-content", params],
    queryFn: () => getTopContent(params),
  });
}

export function usePlatforms(params: GraphParams = {}) {
  return useQuery({
    queryKey: ["graphs", "platforms", params],
    queryFn: () => getPlatforms(params),
  });
}

export function usePlayMethods(params: GraphParams = {}) {
  return useQuery({
    queryKey: ["graphs", "play-methods", params],
    queryFn: () => getPlayMethods(params),
  });
}

export function useTopUsers(params: GraphParams & { limit?: number } = {}) {
  return useQuery({
    queryKey: ["graphs", "top-users", params],
    queryFn: () => getTopUsers(params),
  });
}
