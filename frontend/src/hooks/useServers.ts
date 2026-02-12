import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addServer, deleteServer, listServers, testServer } from "../api/servers";
import type { ServerCreate } from "../types/server";

export function useServers() {
  return useQuery({
    queryKey: ["servers"],
    queryFn: listServers,
  });
}

export function useAddServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ServerCreate) => addServer(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servers"] }),
  });
}

export function useDeleteServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteServer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servers"] }),
  });
}

export function useTestServer() {
  return useMutation({
    mutationFn: (id: string) => testServer(id),
  });
}
