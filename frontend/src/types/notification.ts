export interface NotificationAgent {
  id: string;
  agent_type: string;
  name: string;
  is_enabled: boolean;
  config_json: Record<string, unknown>;
  triggers: string[];
  created_at: string;
}

export interface NotificationAgentCreate {
  agent_type: string;
  name: string;
  config_json: Record<string, unknown>;
  triggers: string[];
  is_enabled?: boolean;
}

export interface NotificationLog {
  id: string;
  agent_id?: string;
  trigger_type: string;
  subject?: string;
  success: boolean;
  error_message?: string;
  sent_at: string;
}
