import apiClient from "./client";
import type { Library, PaginatedLibraryItems, LibraryStats } from "../types/library";

export async function listLibraries(): Promise<Library[]> {
  const { data } = await apiClient.get<Library[]>("/libraries/");
  return data;
}

export async function getLibrary(id: string): Promise<Library> {
  const { data } = await apiClient.get<Library>(`/libraries/${id}`);
  return data;
}

export async function getLibraryItems(
  id: string,
  params?: {
    page?: number;
    page_size?: number;
    item_type?: string;
    watched?: boolean;
    sort_by?: string;
    sort_order?: string;
    search?: string;
  }
): Promise<PaginatedLibraryItems> {
  const { data } = await apiClient.get<PaginatedLibraryItems>(
    `/libraries/${id}/items`,
    { params }
  );
  return data;
}

export async function getLibraryStats(): Promise<LibraryStats> {
  const { data } = await apiClient.get<LibraryStats>("/libraries/stats");
  return data;
}

export async function triggerLibrarySync(): Promise<void> {
  await apiClient.post("/libraries/sync");
}
