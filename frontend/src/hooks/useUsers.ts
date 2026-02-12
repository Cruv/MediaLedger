import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLinkedUsers, getUser, linkUser, listUsers, unlinkUser } from "../api/users";

interface UseUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  serverId?: string;
  tagId?: string;
}

export function useUsers({ page = 1, pageSize = 25, search, serverId, tagId }: UseUsersParams = {}) {
  return useQuery({
    queryKey: ["users", page, pageSize, search, serverId, tagId],
    queryFn: () =>
      listUsers({
        page,
        page_size: pageSize,
        search: search || undefined,
        server_id: serverId || undefined,
        tag_id: tagId || undefined,
      }),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => getUser(id),
    enabled: !!id,
  });
}

export function useLinkedUsers(userId: string) {
  return useQuery({
    queryKey: ["users", userId, "linked"],
    queryFn: () => getLinkedUsers(userId),
    enabled: !!userId,
  });
}

export function useLinkUser(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (otherId: string) => linkUser(userId, otherId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", userId, "linked"] });
    },
  });
}

export function useUnlinkUser(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (otherId: string) => unlinkUser(userId, otherId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", userId, "linked"] });
    },
  });
}
