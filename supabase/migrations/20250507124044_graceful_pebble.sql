/*
  # Add logging capabilities to event tracking system

  1. Changes
    - Add `debug_log` column to `events` table to store detailed logging information
    - Add `request_headers` column to store incoming request headers
    - Add `processing_time` column to track event processing duration
*/

-- Add logging columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS debug_log jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS request_headers jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS processing_time integer DEFAULT NULL;

-- Create index for debug_log queries
CREATE INDEX IF NOT EXISTS idx_events_debug_log
ON events USING gin(debug_log);

-- Create index for processing time analysis
CREATE INDEX IF NOT EXISTS idx_events_processing_time
ON events(processing_time);