import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAgent,
  deleteAgent,
  fetchAgents,
  fetchNotificationLog,
  fetchTriggers,
  testAgent,
} from "../api/notifications";
import type { NotificationAgentCreate } from "../types/notification";

export function useNotificationAgents() {
  return useQuery({
    queryKey: ["notification-agents"],
    queryFn: fetchAgents,
  });
}

export function useTriggers() {
  return useQuery({
    queryKey: ["notification-triggers"],
    queryFn: fetchTriggers,
  });
}

export function useNotificationLog() {
  return useQuery({
    queryKey: ["notification-log"],
    queryFn: fetchNotificationLog,
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationAgentCreate) => createAgent(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-agents"] }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAgent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-agents"] }),
  });
}

export function useTestAgent() {
  return useMutation({
    mutationFn: (id: string) => testAgent(id),
  });
}
