import client from "./client";
import type {
  ConcurrentEvent,
  Correlation,
  IPOverlap,
  SharingOverview,
  SharingScoreDetail,
} from "../types/sharing";

export async function fetchSharingOverview(): Promise<SharingOverview> {
  const { data } = await client.get("/sharing");
  return data;
}

export async function fetchSharingDetail(userId: string): Promise<SharingScoreDetail> {
  const { data } = await client.get(`/sharing/${userId}`);
  return data;
}

export async function triggerAnalysis(): Promise<{ message: string }> {
  const { data } = await client.post("/sharing/analyze");
  return data;
}

export async function fetchCorrelations(): Promise<Correlation[]> {
  const { data } = await client.get("/sharing/correlations");
  return data;
}

export async function confirmCorrelation(id: string): Promise<void> {
  await client.post(`/sharing/correlations/${id}/confirm`);
}

export async function dismissCorrelation(id: string): Promise<void> {
  await client.post(`/sharing/correlations/${id}/dismiss`);
}

export async function fetchIPOverlaps(): Promise<IPOverlap[]> {
  const { data } = await client.get("/sharing/ip-overlaps");
  return data;
}

export async function fetchConcurrentEvents(userId?: string): Promise<ConcurrentEvent[]> {
  const { data } = await client.get("/sharing/concurrent-events", {
    params: userId ? { user_id: userId } : undefined,
  });
  return data;
}
