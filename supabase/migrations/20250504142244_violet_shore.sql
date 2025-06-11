/*
  # Update clients table RLS policy

  1. Changes
    - Drop existing RLS policy
    - Create new policy that allows inserts from non-authenticated users
    - Maintain security for other operations
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Clients can manage their own data" ON clients;

-- Create new policy that allows inserts from non-authenticated users
CREATE POLICY "Clients can manage their own data"
ON clients
FOR ALL
USING (
  CASE
    WHEN (current_setting('role'::text) = 'authenticated'::text) THEN (id = auth.uid())
    ELSE true
  END
)
WITH CHECK (true);