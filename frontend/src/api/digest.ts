import apiClient from "./client";
import type { DigestPreview } from "../types/digest";

export async function fetchDigestPreview(days?: number): Promise<DigestPreview> {
  const params: Record<string, number> = {};
  if (days) params.days = days;
  const { data } = await apiClient.get<DigestPreview>("/digest/preview", { params });
  return data;
}

export async function sendDigest(days?: number): Promise<{ message: string }> {
  const params: Record<string, number> = {};
  if (days) params.days = days;
  const { data } = await apiClient.post<{ message: string }>("/digest/send", null, { params });
  return data;
}
