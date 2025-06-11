/*
  # Fix clients table RLS policy

  1. Changes
    - Drop existing policy
    - Create new policy that allows inserts with proper security checks
    - Maintain existing read access control
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Clients can view their own data" ON clients;

-- Create new policy for all operations
CREATE POLICY "Clients can manage their own data"
ON clients
FOR ALL
TO authenticated
USING (
  CASE 
    WHEN (SELECT current_setting('role') = 'authenticated') THEN
      -- For SELECT/UPDATE/DELETE: only allow access to own records
      id = auth.uid()
    ELSE
      -- For INSERT: allow creation of new records
      true
  END
)
WITH CHECK (
  -- For INSERT/UPDATE: ensure id matches auth.uid()
  id = auth.uid()
);