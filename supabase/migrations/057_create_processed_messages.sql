-- Create processed_messages table for duplicate email detection
-- Tracks which email message IDs have already been processed by the n8n workflow
CREATE TABLE IF NOT EXISTS processed_messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    message_id TEXT NOT NULL UNIQUE,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by message_id
CREATE INDEX IF NOT EXISTS idx_processed_messages_message_id ON processed_messages(message_id);
