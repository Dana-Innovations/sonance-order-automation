-- =====================================================
-- AI Prompt Builder - Temporary Storage Bucket
-- =====================================================
-- This migration creates a temporary storage bucket for
-- the AI Prompt Builder feature to store uploaded PDFs
-- and voice recordings during the prompt generation session.
--
-- Files are automatically deleted after 7 days via
-- Supabase lifecycle policy (configured in dashboard).
-- =====================================================

-- Create temporary storage bucket for prompt builder files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prompt-builder-temp',
  'prompt-builder-temp',
  false, -- Private bucket (not publicly accessible)
  10485760, -- 10MB limit per file
  ARRAY['application/pdf', 'audio/webm', 'audio/wav', 'audio/mpeg']
);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================
-- Users can only access their own files
-- Files are organized by user_id in folder structure

-- Policy: Users can upload their own files
CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'prompt-builder-temp'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can read their own files
CREATE POLICY "Users can read their own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prompt-builder-temp'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'prompt-builder-temp'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- Lifecycle Policy Configuration
-- =====================================================
-- To enable auto-deletion after 7 days:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to: Storage > prompt-builder-temp > Configuration
-- 3. Add lifecycle rule:
--    - Delete files older than 7 days
--    - This helps manage storage costs and ensures
--      temporary files don't accumulate
-- =====================================================

-- Add comment explaining the bucket's purpose
COMMENT ON TABLE storage.buckets IS 'Temporary storage for AI Prompt Builder uploads (PDFs and audio recordings). Files auto-delete after 7 days.';
