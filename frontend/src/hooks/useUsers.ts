import { useQuery } from "@tanstack/react-query";
import { getUser, listUsers } from "../api/users";

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
