export interface AlertRule {
  id: string;
  name: string;
  condition_type: string;
  condition_config: Record<string, unknown>;
  is_enabled: boolean;
  notify_agent_ids?: string[];
  cooldown_minutes: number;
  created_at: string;
  updated_at: string;
  recent_event_count: number;
  unresolved_count: number;
}

export interface AlertEvent {
  id: string;
  rule_id: string;
  rule_name?: string;
  triggered_at: string;
  context_json?: Record<string, unknown>;
  resolved: boolean;
}

export interface PaginatedAlertEvents {
  items: AlertEvent[];
  total: number;
  page: number;
  page_size: number;
}

export const CONDITION_TYPES = [
  { value: "concurrent_streams", label: "Concurrent Streams", description: "Alert when a user exceeds max simultaneous streams" },
  { value: "new_device", label: "New Device Detected", description: "Alert when a new device is seen" },
  { value: "sharing_score_threshold", label: "Sharing Score", description: "Alert when sharing score exceeds threshold" },
  { value: "watch_threshold", label: "Excessive Watch Time", description: "Alert when daily watch time exceeds limit" },
  { value: "inactive_user", label: "Inactive User Active", description: "Alert when a previously inactive user starts streaming" },
] as const;
