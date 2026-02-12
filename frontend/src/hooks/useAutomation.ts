import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  listHistory,
} from "../api/automation";

export function useAutomationRules() {
  return useQuery({
    queryKey: ["automation", "rules"],
    queryFn: listRules,
  });
}

export function useCreateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation"] }),
  });
}

export function useUpdateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Record<string, unknown>>) =>
      updateRule(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation"] }),
  });
}

export function useDeleteAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation"] }),
  });
}

export function useAutomationHistory(
  page = 1,
  ruleId?: string,
  success?: boolean
) {
  return useQuery({
    queryKey: ["automation", "history", page, ruleId, success],
    queryFn: () => listHistory({ page, rule_id: ruleId, success }),
  });
}
