/*
  # Add is_active column to user_profiles table

  1. Changes
    - Add `is_active` boolean column to `user_profiles` table
    - Set default value to `true` for new records
    - Update existing records to be active by default

  2. Security
    - No RLS changes needed as existing policies will apply
*/

-- Add is_active column to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
END $$;