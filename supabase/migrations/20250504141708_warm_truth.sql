/*
  # Add Grower Organization ID to clients table

  1. Changes
    - Add `grower_org_id` column to `clients` table
    - Add index for faster lookups
*/

-- Add grower_org_id column
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS grower_org_id TEXT;

-- Create index for grower_org_id
CREATE INDEX IF NOT EXISTS idx_clients_grower_org_id
ON clients(grower_org_id);