/*
  # Create chat and followup tables

  1. New Tables
    - `chats`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to leads)
      - `user_id` (uuid, foreign key to auth.users)
      - `contact_name` (text)
      - `phone` (text)
      - `mom` (text, minutes of meeting)
      - `notes` (text)
      - `call_status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `followups`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key to chats)
      - `lead_id` (uuid, foreign key to leads)
      - `user_id` (uuid, foreign key to auth.users)
      - `follow_up_date` (date)
      - `notes` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own data
    - Add policies for admins to view all data

  3. Functions
    - Add trigger to update updated_at columns
*/

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  phone text NOT NULL,
  mom text NOT NULL,
  notes text,
  call_status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create followups table
CREATE TABLE IF NOT EXISTS followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  follow_up_date date NOT NULL,
  notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS chats_lead_id_idx ON chats(lead_id);
CREATE INDEX IF NOT EXISTS chats_user_id_idx ON chats(user_id);
CREATE INDEX IF NOT EXISTS followups_chat_id_idx ON followups(chat_id);
CREATE INDEX IF NOT EXISTS followups_lead_id_idx ON followups(lead_id);
CREATE INDEX IF NOT EXISTS followups_user_id_idx ON followups(user_id);
CREATE INDEX IF NOT EXISTS followups_follow_up_date_idx ON followups(follow_up_date);

-- RLS Policies for chats
CREATE POLICY "Users can read own chats"
  ON chats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats"
  ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats"
  ON chats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all chats"
  ON chats
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- RLS Policies for followups
CREATE POLICY "Users can read own followups"
  ON followups
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own followups"
  ON followups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own followups"
  ON followups
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all followups"
  ON followups
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Add triggers for updated_at
CREATE TRIGGER trg_chats_set_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_followups_set_updated_at
  BEFORE UPDATE ON followups
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();