import apiClient from "./client";
import type { UserTag } from "../types/tags";

export async function listTags(): Promise<UserTag[]> {
  const { data } = await apiClient.get<UserTag[]>("/tags/");
  return data;
}

export async function createTag(body: { name: string; color: string; description?: string }): Promise<UserTag> {
  const { data } = await apiClient.post<UserTag>("/tags/", body);
  return data;
}

export async function updateTag(id: string, body: { name?: string; color?: string; description?: string }): Promise<UserTag> {
  const { data } = await apiClient.patch<UserTag>(`/tags/${id}`, body);
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  await apiClient.delete(`/tags/${id}`);
}

export async function assignTag(tagId: string, userIds: string[]): Promise<void> {
  await apiClient.post(`/tags/${tagId}/assign`, { user_ids: userIds });
}

export async function unassignTag(tagId: string, userIds: string[]): Promise<void> {
  await apiClient.post(`/tags/${tagId}/unassign`, { user_ids: userIds });
}
