/*
  # Add RLS policy for user profile creation

  1. New Policy
    - Allow authenticated users to insert their own profile
    - Prevents the chicken-and-egg problem where new users can't create profiles
    - Works alongside existing admin policies

  2. Security
    - Users can only insert profiles where user_id matches their auth.uid()
    - Prevents users from creating profiles for other users
    - Maintains data integrity and security
*/

-- Add policy to allow authenticated users to insert their own profile
CREATE POLICY "Allow authenticated users to insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);