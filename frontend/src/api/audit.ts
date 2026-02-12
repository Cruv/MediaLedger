import apiClient from "./client";
import type { PaginatedAuditLog, UserNote } from "../types/audit";

export async function listUserNotes(userId: string): Promise<UserNote[]> {
  const { data } = await apiClient.get(`/users/${userId}/notes`);
  return data;
}

export async function createUserNote(
  userId: string,
  body: { content: string; pinned?: boolean }
): Promise<UserNote> {
  const { data } = await apiClient.post(`/users/${userId}/notes`, body);
  return data;
}

export async function updateNote(
  noteId: string,
  body: { content?: string; pinned?: boolean }
): Promise<UserNote> {
  const { data } = await apiClient.patch(`/notes/${noteId}`, body);
  return data;
}

export async function deleteNote(noteId: string): Promise<void> {
  await apiClient.delete(`/notes/${noteId}`);
}

export async function fetchAuditLog(params?: {
  target_type?: string;
  target_id?: string;
  action?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedAuditLog> {
  const { data } = await apiClient.get("/audit-log", { params });
  return data;
}
