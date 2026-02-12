import { useQuery } from "@tanstack/react-query";
import { getUser, listUsers } from "../api/users";

export function useUsers(page = 1, pageSize = 25, search?: string) {
  return useQuery({
    queryKey: ["users", page, pageSize, search],
    queryFn: () => listUsers({ page, page_size: pageSize, search }),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => getUser(id),
    enabled: !!id,
  });
}
