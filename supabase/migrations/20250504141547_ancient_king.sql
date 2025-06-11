/*
  # Fix clients table RLS policy

  1. Changes
    - Drop existing recursive policy on clients table
    - Add new simplified policy that directly checks auth.uid
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Clients can view their own data" ON clients;

-- Create new non-recursive policy
CREATE POLICY "Clients can view their own data"
ON clients
FOR ALL
TO authenticated
USING (id = auth.uid());