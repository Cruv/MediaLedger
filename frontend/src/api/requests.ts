import client from "./client";
import type { MediaRequest, PaginatedRequests, RequestCreate, RequestStats } from "../types/request";

export async function fetchRequests(
  page: number,
  pageSize: number,
  status?: string,
  source?: string,
  search?: string,
  sortBy?: string,
  sortDir?: string,
): Promise<PaginatedRequests> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  if (status) params.status = status;
  if (source) params.source = source;
  if (search) params.search = search;
  if (sortBy) params.sort_by = sortBy;
  if (sortDir) params.sort_dir = sortDir;
  const { data } = await client.get("/requests", { params });
  return data;
}

export async function fetchRequestStats(): Promise<RequestStats> {
  const { data } = await client.get("/requests/stats");
  return data;
}

export async function createRequest(body: RequestCreate): Promise<MediaRequest> {
  const { data } = await client.post("/requests", body);
  return data;
}

export async function deleteRequest(id: string): Promise<void> {
  await client.delete(`/requests/${id}`);
}
