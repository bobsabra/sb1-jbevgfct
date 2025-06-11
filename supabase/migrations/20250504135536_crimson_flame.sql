/*
  # Add credit field to attribution_results table

  1. Changes
    - Add `credit` column to store the monetary value attributed to each touchpoint
    - Add index on `credit` column for aggregation queries
*/

-- Add credit column to attribution_results
ALTER TABLE attribution_results 
ADD COLUMN IF NOT EXISTS credit numeric DEFAULT 0;

-- Create index for credit column
CREATE INDEX IF NOT EXISTS idx_attribution_results_credit 
ON attribution_results(credit);