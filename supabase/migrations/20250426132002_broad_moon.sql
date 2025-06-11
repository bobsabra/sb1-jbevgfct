/*
  # Initial schema for attribution tracking system

  1. New Tables
    - `clients` - Stores information about client websites using the tracker
    - `visitors` - Stores unique visitors with their visitor_id and optional email_hash
    - `events` - Records all tracked events (page views, form submissions, etc.)
    - `identity_map` - Maps email hashes to multiple visitor ids (for cross-device tracking)
    - `conversions` - Stores conversion events with details
    - `attribution_results` - Records attribution calculations
    
  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for read/write operations
*/

-- Create tables
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text UNIQUE NOT NULL,
  api_key text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visitors (
  visitor_id text PRIMARY KEY,
  email_hash text,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  client_id uuid REFERENCES clients(id) NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text REFERENCES visitors(visitor_id) NOT NULL,
  event_type text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  gclid text,
  ttclid text,
  msclkid text,
  page_url text NOT NULL,
  referrer text,
  email_hash text,
  timestamp timestamptz NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_map (
  email_hash text PRIMARY KEY,
  visitor_ids text[] NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text REFERENCES visitors(visitor_id) NOT NULL,
  email_hash text,
  conversion_type text NOT NULL,
  value numeric,
  currency text,
  timestamp timestamptz NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attribution_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) NOT NULL,
  name text NOT NULL, -- first_touch, last_touch, linear, time_decay, position_based
  settings jsonb, -- For storing model-specific settings
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attribution_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id uuid REFERENCES conversions(id) NOT NULL,
  visitor_id text REFERENCES visitors(visitor_id) NOT NULL,
  attributed_event_id uuid REFERENCES events(id),
  attribution_model text NOT NULL,
  attribution_weight numeric NOT NULL, -- Value between 0 and 1
  source text,
  medium text,
  campaign text,
  timestamp timestamptz NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visitors_email_hash ON visitors(email_hash);
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversions_visitor_id ON conversions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_attribution_results_conversion_id ON attribution_results(conversion_id);
CREATE INDEX IF NOT EXISTS idx_attribution_results_visitor_id ON attribution_results(visitor_id);

-- Enable Row Level Security on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Note: In a real implementation, these would be more granular and based on JWT claims

-- Clients table policies
CREATE POLICY "Clients can view their own data"
  ON clients
  FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM clients
  ));

-- Visitors table policies
CREATE POLICY "Clients can view their own visitors"
  ON visitors
  FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id = auth.uid()
  ));

-- Events table policies
CREATE POLICY "Clients can view their own events"
  ON events
  FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id = auth.uid()
  ));

-- Create function for updating visitor last_seen_at
CREATE OR REPLACE FUNCTION update_visitor_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE visitors
  SET last_seen_at = NEW.timestamp
  WHERE visitor_id = NEW.visitor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for visitor last_seen_at update
CREATE TRIGGER update_visitor_last_seen_trigger
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION update_visitor_last_seen();

-- Create function for updating identity_map
CREATE OR REPLACE FUNCTION update_identity_map()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_hash IS NOT NULL THEN
    -- Update identity map if this email hash exists
    UPDATE identity_map
    SET visitor_ids = array_append(visitor_ids, NEW.visitor_id),
        updated_at = now()
    WHERE email_hash = NEW.email_hash
    AND client_id = NEW.client_id
    AND NOT (NEW.visitor_id = ANY(visitor_ids));
    
    -- Insert if it doesn't exist
    IF NOT FOUND THEN
      INSERT INTO identity_map (email_hash, visitor_ids, client_id)
      VALUES (NEW.email_hash, ARRAY[NEW.visitor_id], NEW.client_id);
    END IF;
    
    -- Also update the visitor record
    UPDATE visitors
    SET email_hash = NEW.email_hash
    WHERE visitor_id = NEW.visitor_id
    AND (email_hash IS NULL OR email_hash != NEW.email_hash);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for identity_map updates
CREATE TRIGGER update_identity_map_trigger
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION update_identity_map();