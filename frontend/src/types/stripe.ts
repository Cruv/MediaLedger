export interface StripeSubscription {
  user_id: string;
  username: string;
  server_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  is_disabled: boolean;
}

export interface LinkResult {
  ok: boolean;
  username: string;
  stripe_customer_id: string;
}

export interface SyncResult {
  status: string;
  subscription_id?: string;
  customer_id: string;
}
