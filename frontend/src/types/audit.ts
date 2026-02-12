export interface UserNote {
  id: string;
  user_id: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  target_type: string;
  target_id?: string;
  target_label?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedAuditLog {
  items: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
}
