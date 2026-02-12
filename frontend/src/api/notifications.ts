import client from "./client";
import type { NotificationAgent, NotificationAgentCreate, NotificationLog } from "../types/notification";

export async function fetchAgents(): Promise<NotificationAgent[]> {
  const { data } = await client.get("/notifications/agents");
  return data;
}

export async function createAgent(body: NotificationAgentCreate): Promise<NotificationAgent> {
  const { data } = await client.post("/notifications/agents", body);
  return data;
}

export async function deleteAgent(id: string): Promise<void> {
  await client.delete(`/notifications/agents/${id}`);
}

export async function testAgent(id: string): Promise<{ success: boolean; message: string }> {
  const { data } = await client.post(`/notifications/agents/${id}/test`);
  return data;
}

export async function fetchTriggers(): Promise<string[]> {
  const { data } = await client.get("/notifications/triggers");
  return data;
}

export async function fetchNotificationLog(): Promise<NotificationLog[]> {
  const { data } = await client.get("/notifications/log");
  return data;
}
