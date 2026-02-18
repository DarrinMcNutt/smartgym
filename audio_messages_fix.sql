-- ============================================
-- AUDIO MESSAGES FIX
-- This ensures audio messages display correctly
-- ============================================

-- Verify audio_url column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'audio_url'
    ) THEN
        ALTER TABLE messages ADD COLUMN audio_url TEXT;
        RAISE NOTICE '✅ Added audio_url column to messages table';
    ELSE
        RAISE NOTICE '✅ audio_url column already exists';
    END IF;
END $$;

-- Ensure RLS allows reading audio_url
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON messages;

CREATE POLICY "Users can view messages they sent or received"
ON messages FOR SELECT
USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
);

RAISE NOTICE '✅ Audio messages fix completed!';
