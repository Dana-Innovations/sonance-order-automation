-- =====================================================
-- Create Prompt Builder Sessions Table
-- =====================================================
-- This migration creates the base table for storing
-- AI prompt builder sessions (including customer wizard)
-- =====================================================

-- Create prompt_builder_sessions table
CREATE TABLE IF NOT EXISTS prompt_builder_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session metadata
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Session',
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'error')),

  -- Session type and progress
  is_customer_wizard BOOLEAN DEFAULT false,
  wizard_step INTEGER DEFAULT 0,

  -- Data storage (JSONB for flexibility)
  customer_data JSONB DEFAULT '{}',
  child_accounts JSONB DEFAULT '[]',
  question_answers JSONB DEFAULT '[]',

  -- Generated prompts
  generated_prompts JSONB DEFAULT '{}',

  -- For customer wizard - track customer name
  customer_name VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prompt_sessions_user_id
  ON prompt_builder_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_prompt_sessions_wizard
  ON prompt_builder_sessions(user_id, is_customer_wizard)
  WHERE is_customer_wizard = true;

CREATE INDEX IF NOT EXISTS idx_prompt_sessions_status
  ON prompt_builder_sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_prompt_sessions_created_at
  ON prompt_builder_sessions(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_prompt_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prompt_sessions_updated_at
  BEFORE UPDATE ON prompt_builder_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_sessions_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE prompt_builder_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own sessions
CREATE POLICY "Users can view their own sessions"
  ON prompt_builder_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON prompt_builder_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON prompt_builder_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON prompt_builder_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE prompt_builder_sessions IS
  'Stores AI prompt builder sessions including customer setup wizard sessions';

COMMENT ON COLUMN prompt_builder_sessions.customer_name IS
  'Customer name being set up (for customer wizard sessions)';

COMMENT ON COLUMN prompt_builder_sessions.is_customer_wizard IS
  'True if this session is for the customer setup wizard';

COMMENT ON COLUMN prompt_builder_sessions.wizard_step IS
  'Current step number in the wizard (0-30)';

COMMENT ON COLUMN prompt_builder_sessions.customer_data IS
  'JSONB object storing all customer form data during wizard';

COMMENT ON COLUMN prompt_builder_sessions.child_accounts IS
  'JSONB array storing child account details for multi-account customers';

COMMENT ON COLUMN prompt_builder_sessions.question_answers IS
  'JSONB array storing question-answer pairs from voice recordings';

COMMENT ON COLUMN prompt_builder_sessions.generated_prompts IS
  'JSONB object storing AI-generated prompts (order_header, order_line, multi_account_routing)';
