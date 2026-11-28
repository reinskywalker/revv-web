export interface NewsArticle {
  id: string;
  slug?: string | null;
  title: string;
  summary: string;
  content: string;
  category: string;
  author_name: string;
  cover_image_url?: string | null;
  thumbnail_url?: string | null;
  reading_time_minutes: number;
  is_highlight: boolean;
  high_importance?: boolean;
  is_broadcasted?: boolean;
  published_at: string;
}

export interface BackendMeta {
  status: string;
  message: string;
}

export interface ApiResponse<T> {
  meta: BackendMeta;
  data: T;
  results?: unknown;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RequestOtpResponseData {
  otp?: string;
  expires_at?: string;
}

export interface EquippedCosmeticBadgeItem {
  code: string;
  title: string;
  asset_hash?: string | null;
  lottie_url?: string | null;
}

export interface RiderProfile {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  is_phone_verified: boolean;
  is_email_verified: boolean;
  role: string;
  username?: string | null;
  noreg?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  equipped_frame_code?: string | null;
  equipped_badges?: EquippedCosmeticBadgeItem[];
  is_verified_profile?: boolean;
  subscription_tier?: string | null;
  banner_url?: string | null;
  date_of_birth?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  job?: string | null;
  account_visibility?: string | null;
  show_motorcycle_count?: boolean | null;
  show_garage_details?: boolean | null;
  show_city?: boolean | null;
  show_state?: boolean | null;
  show_country?: boolean | null;
  show_job?: boolean | null;
  show_real_name?: boolean | null;
  has_pin?: boolean;
  show_achievements?: boolean | null;
  show_riding_stats?: boolean | null;
  privacy_country?: string | null;
  privacy_saved_routes?: string | null;
  leaderboard_opt_in?: boolean | null;
  leaderboard_opt_changes_remaining?: number | null;
}

export interface GarageMotorcycle {
  id: string;
  name: string;
  type: string;
  brand_name?: string | null;
  series_name?: string | null;
  nickname?: string | null;
  current_mileage: number;
  master_motorcycle_id?: number | null;
  manufacture_year?: number | null;
  engine_capacity_cc?: number | null;
  transmission: string;
  category: string;
  plate_number?: string | null;
  avg_daily_mileage: number;
  is_primary: boolean;
  image_path?: string | null;
}

export interface MasterMotorcycleItem {
  id: number;
  brand_id: number;
  brand_name: string;
  series_name: string;
  transmission: string;
  category: string;
  engine_cc?: number | null;
  is_active?: boolean;
}

export interface MasterBrandItem {
  id: number;
  name: string;
  is_active: boolean;
}

export interface MasterComponentItem {
  id: number;
  code: string;
  name: string;
  name_id?: string | null;
  name_en?: string | null;
  default_interval_km?: number | null;
  default_interval_months?: number | null;
  applicable_transmission: string[];
  is_active: boolean;
}

export interface PublicMasterBrandItem {
  id: number;
  name: string;
  motorcycle_count: number;
}

export interface MasterNotificationTemplateItem {
  id: number;
  code: string;
  category: string;
  name: string;
  title_template: string;
  body_template: string;
  language: string;
  variables_hint?: string | null;
  updated_at: string;
}

export interface MasterEmailTemplateItem {
  id: number;
  code: string;
  name: string;
  subject_template: string;
  html_body: string;
  variables_hint: string;
  updated_at: string;
}

export interface MasterGeneralSettingItem {
  id: number;
  category: string;
  setting_key: string;
  setting_value: string;
  value_type: string;
  label: string;
  description?: string | null;
  updated_at: string;
}

export interface FeedPostItem {
  id: string;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url?: string | null;
  author_frame_code?: string | null;
  author_is_verified?: boolean;
  author_avatar?: string | null;
  post_type: string;
  caption?: string | null;
  image_url?: string | null;
  motorcycle_label?: string | null;
  bike_label?: string | null;
  metadata?: Record<string, unknown>;
  visibility: string;
  like_count: number;
  is_liked_by_me: boolean;
  viewer_has_liked?: boolean;
  created_at: string;
  comment_count: number;
}

export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  suspended_users: number;
  deleted_users: number;
  total_garages: number;
  total_feed_posts: number;
  total_communities: number;
  total_trips?: number;
  total_news_articles?: number;
  total_master_brands: number;
  total_master_motorcycles: number;
  total_master_components: number;
  master_brands_count?: number;
  master_motorcycles_count?: number;
  master_components_count?: number;
}

export interface AdminUserItem {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  username?: string | null;
  noreg?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  city?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  bio?: string | null;
  is_phone_verified?: boolean;
  is_email_verified?: boolean;
  status: string;
  role: string;
  created_at: string;
}

export interface PublicProfileGarageItem {
  id: string;
  brand_name: string;
  series_name: string;
  nickname: string | null;
  category: string | null;
  transmission: string | null;
  image_url?: string | null;
  image_path?: string | null;
  plate_number: string | null;
  manufacture_year: number | null;
  engine_capacity_cc: number | null;
  current_mileage: number;
  is_primary: boolean;
}

export interface PublicProfileResponse {
  id: string;
  username: string;
  noreg: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  equipped_frame_code?: string | null;
  equipped_badges?: EquippedCosmeticBadgeItem[];
  is_verified_profile?: boolean;
  subscription_tier?: string | null;
  banner_url: string | null;
  bio: string | null;
  city: string | null;
  state?: string | null;
  country?: string | null;
  job: string | null;
  account_visibility: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE" | "CUSTOM";
  is_friend: boolean;
  has_pending_request: boolean;
  is_private: boolean;
  total_distance_km?: number | null;
  max_speed_kmh?: number | null;
  show_city?: boolean | null;
  show_state?: boolean | null;
  show_country?: boolean | null;
  show_job?: boolean | null;
  show_real_name?: boolean | null;
  show_motorcycle_count?: boolean | null;
  show_garage_details?: boolean | null;
  show_achievements?: boolean | null;
  show_riding_stats?: boolean | null;
  privacy_country?: string | null;
  privacy_saved_routes?: string | null;
  motorcycle_count: number | null;
  garage: PublicProfileGarageItem[] | null;
  posts: FeedPostItem[] | null;
}

export interface AchievementTierProgress {
  level: number;
  name: string;
  threshold: number;
  xp: number;
  unlocked: boolean;
  unlocked_at?: string | null;
}

export interface UserAchievementItem {
  code: string;
  title: string;
  description: string;
  category: string;
  kind: string;
  has_badge: boolean;
  icon_key?: string | null;
  unit_label?: string | null;
  highest_level: number;
  max_level: number;
  current_value: number;
  next_threshold?: number | null;
  progress_ratio?: number;
  achieved?: boolean;
  achieved_at?: string | null;
  is_pinned?: boolean;
  pinned_slot?: number | null;
  pin_slot?: number | null;
  xp_earned?: number;
  tiers: AchievementTierProgress[];
}

export interface UserAchievementsPayload {
  summary: {
    total_achieved: number;
    total_categories: number;
    badges_unlocked: number;
    total_badge_tiers: number;
    milestones_achieved: number;
    total_milestones: number;
    total_xp: number;
    rank_title?: string;
    pinned_codes: string[];
  };
  pinned_codes: string[];
  achievements: UserAchievementItem[];
  items: UserAchievementItem[];
}

export interface FriendUserItem {
  friend_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  equipped_frame_code?: string | null;
  is_verified_profile?: boolean;
  city?: string | null;
  job?: string | null;
  connected_since: string;
}

export interface FriendRequestItem {
  id: string;
  user_id: string;
  friend_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  equipped_frame_code?: string | null;
  is_verified_profile?: boolean;
  is_outgoing: boolean;
  created_at: string;
}

export interface SocialRiderSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  equipped_frame_code?: string | null;
  is_verified_profile?: boolean;
  city?: string | null;
  friendship_status: "friends" | "outgoing_request" | "incoming_request" | "none";
}
