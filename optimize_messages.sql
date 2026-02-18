-- Optimize messages table for faster chat loading
-- Run this in your Supabase SQL Editor

-- 1. Create indexes for the chat query (sender/receiver + timestamp)
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
ON public.messages (sender_id, receiver_id, created_at DESC);

-- 2. Create index for searching by receiver (helpful for real-time and read status)
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read 
ON public.messages (receiver_id, is_read);

-- 3. Analyze the table to update statistics for the query planner
ANALYZE public.messages;
