export type PlaceItem = {
  pid: number;
  alias: string | null;
  name: string | null;
  mid: string | null;
  remaining_scripts: number;
  amount: number;
  dailycap: number;
  total: number;
  done: number;
  error: number;
  remaining: number;
  requested: number;
  today: number;
  start_date: string | null;
  receipt_count: number;
  today_target: number;
  billing_owner_display: string | null;
  status?: number | null;
  photo_allowed?: boolean | null;
  auto_post?: boolean | null;
};

export type SessionUser = {
  id?: number;
  username: string;
  role?: "admin" | "parent" | "child" | string | null;
  parent_id?: number | null;
  status?: string | null;
};

export type TicketService = {
  service_code: string;
  service_name: string;
  is_active?: boolean;
  is_default?: boolean;
  is_system?: boolean;
};

export type ReviewJobItem = {
  job_id: number;
  username?: string | number | null;
  user_code?: string | null;
  review_id?: string | number | null;
  receipt_id?: number | null;
  script_id?: number | null;
  status?: number | null;
  postdate?: string | null;
  realdate?: string | null;
};

export type AssignedScript = {
  review_script_id: number;
  content?: string | null;
  status?: string | null;
  rdate?: string | null;
};

export type AssignedReceipt = {
  receipt_id?: number | null;
  review_script_id?: number | null;
  content?: string | null;
  status?: string | null;
  rdate?: string | null;
};

export type PlaceImage = {
  id: number;
  filename?: string | null;
  url?: string | null;
};

export type AutoPoolImage = {
  name: string;
  basename?: string | null;
  group?: string | null;
  group_label?: string | null;
  url?: string | null;
};

export type GoodthingUi = {
  place_id?: number;
  message?: string;
  survey_flags?: string[];
  reservation?: string | null;
  reservation_options?: string[];
  reservation_ori_list?: string[];
  wait_time_options?: string[];
  wait_time_allowed_list?: string[];
  purpose_options?: string[];
  purpose_allowed_list?: string[];
  company_options?: string[];
  company_allowed_list?: string[];
  goodthing?: string | string[] | null;
  goodthing_ori_list?: string[];
  goodthing_exclude_list?: string[];
};

export type VisitInfo = {
  job_id?: number;
  place_id?: number;
  survey_flags?: string[];
  selected_survey?: {
    reservation?: string[];
    wait_time?: string[];
    purpose?: string[];
    company?: string[];
    goodthing?: string[];
  };
  options?: {
    reservation?: string[];
    wait_time?: string[];
    purpose?: string[];
    company?: string[];
    goodthing?: string[];
  };
};

export type PlacesResponse = {
  success?: boolean;
  items?: PlaceItem[];
  offset?: number;
  limit?: number;
  has_more?: boolean;
  next_offset?: number | null;
};

export type PlaceStatsResponse = {
  registered_places?: number;
  requested_workload?: number;
  remaining_workload?: number;
  completed_workload?: number;
  completed_places?: number;
};

export type TicketsBalanceResponse = {
  user_id?: number;
  tickets?: Record<string, number>;
};

export type TicketTransaction = {
  id: number;
  user_id: number;
  service_code: string;
  amount: number;
  balance_after: number;
  tx_type: string;
  source_type?: string | null;
  source_id?: string | null;
  description?: string | null;
  counterparty_user_id?: number | null;
  created_at?: string | null;
};

export type TicketsLedgerResponse = {
  user_id?: number;
  transactions?: TicketTransaction[];
};

export type NotificationSummary = {
  total?: number;
  unread_count?: number;
};

export type NotificationItem = {
  id: number;
  category?: string | null;
  notification_type?: string | null;
  place_id?: number | null;
  place_alias?: string | null;
  place_name?: string | null;
  title?: string | null;
  body?: string | null;
  payload?: Record<string, unknown> | null;
  shortage_amount_total?: number;
  attempt_count?: number;
  last_error_code?: string | null;
  last_occurred_at?: string | null;
  created_at?: string | null;
  is_read?: boolean;
  is_resolved?: boolean;
};

export type NotificationsResponse = {
  summary?: NotificationSummary;
  items?: NotificationItem[];
};

export type HiddenPlacesResponse = {
  assigned_places?: Array<{
    alias: string;
    placename?: string | null;
  }>;
  user_hidden?: string[];
  admin_hidden?: string[];
};

export type ChildAccount = {
  id: number;
  username: string;
  status: string;
  assigned_count: number;
  descendants?: Array<{
    id: number;
    username: string;
    status: string;
    depth: number;
  }>;
};

export type TeamPlace = {
  alias: string;
  placename?: string | null;
  mid?: string | null;
  amount?: number | null;
};

export type TeamPlacesResponse = {
  aliases?: string[];
  meta?: TeamPlace[];
};
