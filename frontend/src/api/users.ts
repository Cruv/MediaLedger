import apiClient from "./client";
import type { PaginatedUsers, UserDetail } from "../types/user";

export async function listUsers(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  server_id?: string;
  tag_id?: string;
}): Promise<PaginatedUsers> {
  const { data } = await apiClient.get<PaginatedUsers>("/users/", { params });
  return data;
}

export async function getUser(id: string): Promise<UserDetail> {
  const { data } = await apiClient.get<UserDetail>(`/users/${id}`);
  return data;
}
