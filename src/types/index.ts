// Database Types
export interface Visitor {
  visitor_id: string;
  email_hash?: string;
  created_at: Date;
  last_seen_at: Date;
}

export interface Event {
  id: string;
  visitor_id: string;
  event_type: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  msclkid?: string;
  page_url: string;
  referrer?: string;
  email_hash?: string;
  timestamp: Date;
  client_id: string;
}

export interface IdentityMap {
  email_hash: string;
  visitor_ids: string[];
  updated_at: Date;
}

export interface Conversion {
  id: string;
  visitor_id: string;
  email_hash?: string;
  conversion_type: string;
  value?: number;
  currency?: string;
  timestamp: Date;
  client_id: string;
  ad_id?: string;
}

export interface AttributionResult {
  id: string;
  conversion_id: string;
  visitor_id: string;
  attributed_event_id: string;
  attribution_model: AttributionModel;
  attribution_weight: number;
  source: string;
  medium?: string;
  campaign?: string;
  ad_id?: string;
  timestamp: Date;
  client_id: string;
}

// API Types
export interface EventData {
  visitor_id: string;
  event_type: string;
  email_hash?: string;
  utm_params?: UTMParams;
  click_ids?: ClickIds;
  timestamp: number;
  page_url: string;
  referrer?: string;
  client_id: string;
}

export interface ConversionData {
  visitor_id: string;
  event_type: 'conversion';
  conversion_type: string;
  email_hash?: string;
  value?: number;
  currency?: string;
  timestamp: number;
  page_url: string;
  utm_params?: UTMParams;
  click_ids?: ClickIds;
  client_id: string;
  ad_id?: string;
}

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

export interface ClickIds {
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  msclkid?: string;
  [key: string]: string | undefined;
}

// Attribution Types
export enum AttributionModel {
  FIRST_TOUCH = 'first_touch',
  LAST_TOUCH = 'last_touch',
  LINEAR = 'linear',
  TIME_DECAY = 'time_decay',
  POSITION_BASED = 'position_based',
  CUSTOM = 'custom'
}

export interface AttributionModelSettings {
  lookback_window_days: number;
  decay_base?: number;
  first_touch_weight?: number;
  last_touch_weight?: number;
  middle_touch_weight?: number;
  min_touches_required?: number;
  custom_weights?: Record<string, number>;
  channel_weights?: Record<string, number>;
  exclude_bounced_sessions?: boolean;
  min_session_duration?: number;
  custom_rules?: AttributionRule[];
  preview_data?: AttributionPreview;
}

export interface AttributionRule {
  condition: string;
  weight: number;
  channels?: string[];
}

export interface AttributionPreview {
  total_conversions: number;
  attributed_conversions: number;
  channel_distribution: Record<string, number>;
  sample_paths: AttributionPath[];
}

export interface AttributionPath {
  touchpoints: Touchpoint[];
  conversion_value: number;
  attribution_weights: Record<string, number>;
}

export interface Touchpoint {
  timestamp: Date;
  source: string;
  medium?: string;
  campaign?: string;
  ad_id?: string;
  weight?: number;
}

export interface AttributionModelData {
  id: string;
  name: AttributionModel;
  settings: AttributionModelSettings;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Dashboard Types
export interface DashboardStats {
  total_visitors: number;
  total_conversions: number;
  conversion_rate: number;
  attributed_revenue: number;
  top_sources: {
    source: string;
    conversions: number;
    revenue: number;
  }[];
  attribution_by_model: {
    model: AttributionModel;
    sources: {
      source: string;
      weight: number;
      revenue: number;
    }[];
  }[];
}