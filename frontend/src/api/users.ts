import apiClient from "./client";
import type { LinkedUsersResponse, PaginatedUsers, UserDetail } from "../types/user";

export async function listUsers(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  server_id?: string;
  tag_id?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<PaginatedUsers> {
  const { data } = await apiClient.get<PaginatedUsers>("/users/", { params });
  return data;
}

export async function getUser(id: string): Promise<UserDetail> {
  const { data } = await apiClient.get<UserDetail>(`/users/${id}`);
  return data;
}

export async function getLinkedUsers(id: string): Promise<LinkedUsersResponse> {
  const { data } = await apiClient.get<LinkedUsersResponse>(`/users/${id}/linked`);
  return data;
}

export async function linkUser(userId: string, otherId: string): Promise<void> {
  await apiClient.post(`/users/${userId}/link/${otherId}`);
}

export async function unlinkUser(userId: string, otherId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}/link/${otherId}`);
}
