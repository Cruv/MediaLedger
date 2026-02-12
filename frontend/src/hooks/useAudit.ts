import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUserNote,
  deleteNote,
  fetchAuditLog,
  listUserNotes,
  updateNote,
} from "../api/audit";

export function useUserNotes(userId: string) {
  return useQuery({
    queryKey: ["user-notes", userId],
    queryFn: () => listUserNotes(userId),
    enabled: !!userId,
  });
}

export function useCreateNote(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { content: string; pinned?: boolean }) =>
      createUserNote(userId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notes", userId] });
      qc.invalidateQueries({ queryKey: ["audit-log"] });
    },
  });
}

export function useUpdateNote(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, ...body }: { noteId: string; content?: string; pinned?: boolean }) =>
      updateNote(noteId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notes", userId] });
    },
  });
}

export function useDeleteNote(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notes", userId] });
      qc.invalidateQueries({ queryKey: ["audit-log"] });
    },
  });
}

export function useAuditLog(params?: {
  target_type?: string;
  target_id?: string;
  action?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ["audit-log", params],
    queryFn: () => fetchAuditLog(params),
  });
}
