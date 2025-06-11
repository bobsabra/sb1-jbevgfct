/*
  # Attribution Model Tables

  1. New Tables
    - `attribution_models`: Stores client attribution model preferences
    - `attribution_results`: Stores computed attribution results
    - `sync_history`: Tracks result synchronization status

  2. Changes
    - Added foreign key constraints to link tables
    - Added indexes for performance
    - Enabled RLS with appropriate policies
*/

-- Create attribution_models table
CREATE TABLE IF NOT EXISTS attribution_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) NOT NULL,
  name text NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create attribution_results table
CREATE TABLE IF NOT EXISTS attribution_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) NOT NULL,
  conversion_id uuid REFERENCES events(id) NOT NULL,
  visitor_id text REFERENCES visitors(visitor_id) NOT NULL,
  attributed_event_id uuid REFERENCES events(id),
  attribution_model text NOT NULL,
  attribution_weight numeric NOT NULL,
  source text,
  medium text,
  campaign text,
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create sync_history table
CREATE TABLE IF NOT EXISTS sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) NOT NULL,
  model text NOT NULL,
  since timestamptz NOT NULL,
  status text NOT NULL,
  record_count integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attribution_models_client_id ON attribution_models(client_id);
CREATE INDEX IF NOT EXISTS idx_attribution_results_client_id ON attribution_results(client_id);
CREATE INDEX IF NOT EXISTS idx_attribution_results_conversion_id ON attribution_results(conversion_id);
CREATE INDEX IF NOT EXISTS idx_attribution_results_visitor_id ON attribution_results(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_client_id ON sync_history(client_id);

-- Enable RLS
ALTER TABLE attribution_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Clients can manage their attribution models"
  ON attribution_models
  FOR ALL
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can view their attribution results"
  ON attribution_results
  FOR ALL
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can view their sync history"
  ON sync_history
  FOR ALL
  TO authenticated
  USING (client_id = auth.uid());