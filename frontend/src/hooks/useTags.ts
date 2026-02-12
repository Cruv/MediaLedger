import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTags, createTag, updateTag, deleteTag, assignTag, unassignTag } from "../api/tags";

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: listTags,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; color: string; description?: string }) => createTag(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; color?: string; description?: string }) =>
      updateTag(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useAssignTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, userIds }: { tagId: string; userIds: string[] }) => assignTag(tagId, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUnassignTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, userIds }: { tagId: string; userIds: string[] }) => unassignTag(tagId, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
