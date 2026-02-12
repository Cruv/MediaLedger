import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  fetchCodes,
  generateCode,
  revokeCode,
  fetchRedemptions,
  redeemInvite,
} from "../api/invites";

// ── Templates ──
export function useTemplates() {
  return useQuery({
    queryKey: ["invites", "templates"],
    queryFn: fetchTemplates,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites", "templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Parameters<typeof updateTemplate>[1]) =>
      updateTemplate(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites", "templates"] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites", "templates"] }),
  });
}

// ── Codes ──
export function useCodes(templateId?: string) {
  return useQuery({
    queryKey: ["invites", "codes", templateId],
    queryFn: () => fetchCodes(templateId),
  });
}

export function useGenerateCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: generateCode,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites", "codes"] }),
  });
}

export function useRevokeCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: revokeCode,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites", "codes"] }),
  });
}

// ── Redemptions ──
export function useRedemptions(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["invites", "redemptions", limit, offset],
    queryFn: () => fetchRedemptions({ limit, offset }),
  });
}

export function useRedeemInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: redeemInvite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites", "codes"] });
      qc.invalidateQueries({ queryKey: ["invites", "redemptions"] });
    },
  });
}
