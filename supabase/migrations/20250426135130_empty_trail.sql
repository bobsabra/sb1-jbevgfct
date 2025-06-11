/*
  # Add ad_id column to attribution_results table

  1. Changes
    - Add `ad_id` column to `attribution_results` table
    - Add index on `ad_id` column for faster lookups
*/

-- Add ad_id column
ALTER TABLE attribution_results
ADD COLUMN IF NOT EXISTS ad_id text;

-- Create index for ad_id
CREATE INDEX IF NOT EXISTS idx_attribution_results_ad_id
ON attribution_results(ad_id);