import apiClient from "./client";
import type { GeoMapData, GeoStats } from "../types/geoip";

export async function fetchMapData(userId?: string): Promise<GeoMapData> {
  const params: Record<string, string> = {};
  if (userId) params.user_id = userId;
  const { data } = await apiClient.get<GeoMapData>("/geoip/map-data", { params });
  return data;
}

export async function fetchGeoStats(): Promise<GeoStats> {
  const { data } = await apiClient.get<GeoStats>("/geoip/stats");
  return data;
}

export async function enrichIPs(): Promise<{ enriched: number; remaining: number }> {
  const { data } = await apiClient.post<{ enriched: number; remaining: number }>("/geoip/enrich");
  return data;
}
