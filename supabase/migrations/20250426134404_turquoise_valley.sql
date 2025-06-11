/*
  # Event Tracking System Schema

  1. New Tables
    - visitors: Stores visitor profiles with their identifiers and metadata
    - events: Records all tracked events with UTM parameters and click IDs
    - identity_map: Links email hashes to visitor IDs for cross-device tracking

  2. Indexes
    - Added indexes for client_id, visitor_id, email_hash, and timestamp columns
    - Optimized for common query patterns and joins

  3. Security
    - Enabled Row Level Security (RLS) on all tables
    - Added policies for clients to access only their own data

  4. Triggers
    - update_visitor_last_seen: Updates visitor's last_seen_at timestamp
    - update_identity_map: Maintains visitor ID mappings for email hashes
*/

-- Create visitors table
CREATE TABLE IF NOT EXISTS visitors (
  visitor_id text PRIMARY KEY,
  client_id uuid REFERENCES clients(id) NOT NULL,
  email_hash text,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text REFERENCES visitors(visitor_id) NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  event_type text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  click_ids jsonb,
  email_hash text,
  page_url text NOT NULL,
  referrer text,
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create identity_map table
CREATE TABLE IF NOT EXISTS identity_map (
  email_hash text PRIMARY KEY,
  visitor_ids text[] NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_visitors_client_id ON visitors(client_id);
CREATE INDEX IF NOT EXISTS idx_visitors_email_hash ON visitors(email_hash);
CREATE INDEX IF NOT EXISTS idx_events_client_id ON events(client_id);
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_identity_map_client_id ON identity_map(client_id);

-- Enable RLS
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_map ENABLE ROW LEVEL SECURITY;

-- Create or Replace RLS policies
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Clients can view their own visitors" ON visitors;
  DROP POLICY IF EXISTS "Clients can view their own events" ON events;
  DROP POLICY IF EXISTS "Clients can view their own identity maps" ON identity_map;
END $$;

-- Create new policies
CREATE POLICY "Clients can view their own visitors"
  ON visitors
  FOR ALL
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can view their own events"
  ON events
  FOR ALL
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can view their own identity maps"
  ON identity_map
  FOR ALL
  TO authenticated
  USING (client_id = auth.uid());

-- Create function to update visitor last_seen_at
CREATE OR REPLACE FUNCTION update_visitor_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE visitors
  SET last_seen_at = NEW.timestamp
  WHERE visitor_id = NEW.visitor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating visitor last_seen_at
DROP TRIGGER IF EXISTS update_visitor_last_seen_trigger ON events;
CREATE TRIGGER update_visitor_last_seen_trigger
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_last_seen();

-- Create function to update identity map
CREATE OR REPLACE FUNCTION update_identity_map()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_hash IS NOT NULL THEN
    INSERT INTO identity_map (email_hash, visitor_ids, client_id)
    VALUES (
      NEW.email_hash,
      ARRAY[NEW.visitor_id],
      NEW.client_id
    )
    ON CONFLICT (email_hash) DO UPDATE
    SET
      visitor_ids = array_append(
        array_remove(identity_map.visitor_ids, NEW.visitor_id),
        NEW.visitor_id
      ),
      updated_at = now()
    WHERE NOT identity_map.visitor_ids @> ARRAY[NEW.visitor_id];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating identity map
DROP TRIGGER IF EXISTS update_identity_map_trigger ON events;
CREATE TRIGGER update_identity_map_trigger
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_identity_map();