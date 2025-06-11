/*
  # Add webhook URL to clients table

  1. Changes
    - Add `webhook_url` column to `clients` table for result synchronization
*/

-- Add webhook_url column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS webhook_url text;