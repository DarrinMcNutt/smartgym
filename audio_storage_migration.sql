-- ============================================
-- Audio Messages Storage Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- Create storage bucket for audio messages
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-messages', 'audio-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can read audio messages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audio" ON storage.objects;

-- Policy: Anyone can read audio messages
CREATE POLICY "Anyone can read audio messages"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-messages');

-- Policy: Authenticated users can upload audio
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio-messages' 
  AND auth.role() = 'authenticated'
);

-- Policy: Users can update their own audio files
CREATE POLICY "Users can update own audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'audio-messages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own audio files
CREATE POLICY "Users can delete own audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio-messages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Audio storage setup completed!';
    RAISE NOTICE 'Bucket: audio-messages';
    RAISE NOTICE 'Public: true';
    RAISE NOTICE 'Policies: Read (public), Write/Update/Delete (authenticated)';
END $$;
