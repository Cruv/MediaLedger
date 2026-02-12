export interface AutomationRule {
  id: string;
  name: string;
  description?: string | null;
  condition_type: string;
  condition_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  is_enabled: boolean;
  cooldown_minutes: number;
  created_at: string;
  recent_executions: number;
}

export interface AutomationHistoryEntry {
  id: string;
  rule_id: string;
  action_taken: string;
  target_user_id?: string | null;
  target_username?: string | null;
  context?: Record<string, unknown> | null;
  success: boolean;
  error_message?: string | null;
  executed_at: string;
}

export interface PaginatedAutomationHistory {
  items: AutomationHistoryEntry[];
  total: number;
  page: number;
  page_size: number;
}

export const CONDITION_TYPES = [
  { value: "concurrent_streams", label: "Concurrent Streams", description: "Trigger when a user exceeds max simultaneous streams" },
  { value: "sharing_score", label: "Sharing Score", description: "Trigger when sharing score exceeds threshold" },
  { value: "watch_hours", label: "Watch Hours", description: "Trigger when daily watch time exceeds limit" },
  { value: "inactive_streaming", label: "Inactive User Streaming", description: "Trigger when a previously inactive user starts streaming" },
] as const;

export const ACTION_TYPES = [
  { value: "kill_sessions", label: "Kill Sessions", description: "Terminate all active playback sessions" },
  { value: "disable_user", label: "Disable User", description: "Disable the user's media server account" },
  { value: "add_tag", label: "Add Tag", description: "Add a tag to the user" },
  { value: "remove_tag", label: "Remove Tag", description: "Remove a tag from the user" },
  { value: "notify", label: "Send Notification", description: "Send a notification via enabled agents" },
] as const;
