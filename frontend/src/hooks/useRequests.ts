import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRequest, deleteRequest, fetchRequests, fetchRequestStats } from "../api/requests";
import type { RequestCreate } from "../types/request";

export function useRequests(
  page: number,
  pageSize: number,
  status?: string,
  source?: string,
  search?: string,
) {
  return useQuery({
    queryKey: ["requests", page, pageSize, status, source, search],
    queryFn: () => fetchRequests(page, pageSize, status, source, search),
  });
}

export function useRequestStats() {
  return useQuery({
    queryKey: ["request-stats"],
    queryFn: fetchRequestStats,
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestCreate) => createRequest(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["request-stats"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["request-stats"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
