import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  listEvents,
  resolveEvent,
  getUnresolvedCount,
} from "../api/alerts";

export function useAlertRules() {
  return useQuery({
    queryKey: ["alerts", "rules"],
    queryFn: listRules,
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Record<string, unknown>>) =>
      updateRule(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useAlertEvents(page = 1, resolved?: boolean) {
  return useQuery({
    queryKey: ["alerts", "events", page, resolved],
    queryFn: () => listEvents({ page, resolved }),
  });
}

export function useResolveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resolveEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export function useUnresolvedCount() {
  return useQuery({
    queryKey: ["alerts", "unresolved-count"],
    queryFn: getUnresolvedCount,
    refetchInterval: 30_000,
  });
}
