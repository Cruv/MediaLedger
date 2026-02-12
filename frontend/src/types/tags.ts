export interface UserTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  user_count: number;
  created_at: string;
}

export interface UserTagBrief {
  id: string;
  name: string;
  color: string;
}
