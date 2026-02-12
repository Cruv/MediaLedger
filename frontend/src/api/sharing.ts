import client from "./client";
import type { SharingOverview, SharingScoreDetail } from "../types/sharing";

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
