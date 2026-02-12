import { useQuery } from "@tanstack/react-query";
import { getLibrary, getLibraryItems, listLibraries } from "../api/libraries";

export function useLibraries() {
  return useQuery({
    queryKey: ["libraries"],
    queryFn: listLibraries,
  });
}

export function useLibrary(id: string) {
  return useQuery({
    queryKey: ["libraries", id],
    queryFn: () => getLibrary(id),
    enabled: !!id,
  });
}

export function useLibraryItems(
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
) {
  return useQuery({
    queryKey: ["libraries", id, "items", params],
    queryFn: () => getLibraryItems(id, params),
    enabled: !!id,
  });
}
