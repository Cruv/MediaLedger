import apiClient from "./client";
import type { Server, ServerCreate, ServerTestResult } from "../types/server";

export async function listServers(): Promise<Server[]> {
  const { data } = await apiClient.get<Server[]>("/servers/");
  return data;
}

export async function addServer(body: ServerCreate): Promise<Server> {
  const { data } = await apiClient.post<Server>("/servers/", body);
  return data;
}

export async function deleteServer(id: string): Promise<void> {
  await apiClient.delete(`/servers/${id}`);
}

export async function testServer(id: string): Promise<ServerTestResult> {
  const { data } = await apiClient.post<ServerTestResult>(`/servers/${id}/test`);
  return data;
}
