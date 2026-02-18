-- ============================================
-- FIXED Migration: Message Edit/Delete System
-- ============================================
-- Copy ALL of this file and paste in Supabase SQL Editor

-- Step 1: Add columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS edited_text TEXT,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_for_sender BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_for_receiver BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON public.messages(edited_at);

-- Step 3: Drop existing functions if they exist (to recreate them)
DROP FUNCTION IF EXISTS public.edit_message(UUID, TEXT);
DROP FUNCTION IF EXISTS public.delete_message_for_everyone(UUID);
DROP FUNCTION IF EXISTS public.delete_message_for_me(UUID);

-- Step 4: Create edit_message function
CREATE FUNCTION public.edit_message(
    message_id UUID,
    new_text TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result_row record;
BEGIN
    -- Update the message
    UPDATE public.messages
    SET 
        edited_text = COALESCE(edited_text, text),
        text = new_text,
        edited_at = NOW()
    WHERE id = message_id
      AND sender_id = auth.uid()
      AND is_deleted = FALSE
    RETURNING * INTO result_row;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found or permission denied';
    END IF;
    
    RETURN row_to_json(result_row);
END;
$$;

-- Step 5: Create delete_message_for_everyone function
CREATE FUNCTION public.delete_message_for_everyone(
    message_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result_row record;
BEGIN
    UPDATE public.messages
    SET 
        is_deleted = TRUE,
        deleted_at = NOW()
    WHERE id = message_id
      AND sender_id = auth.uid()
    RETURNING * INTO result_row;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found or permission denied';
    END IF;
    
    RETURN row_to_json(result_row);
END;
$$;

-- Step 6: Create delete_message_for_me function
CREATE FUNCTION public.delete_message_for_me(
    message_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    msg_sender_id UUID;
    msg_receiver_id UUID;
    result_row record;
BEGIN
    -- Get message details
    SELECT sender_id, receiver_id INTO msg_sender_id, msg_receiver_id
    FROM public.messages
    WHERE id = message_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found';
    END IF;
    
    -- Update based on who is deleting
    IF auth.uid() = msg_sender_id THEN
        UPDATE public.messages
        SET deleted_for_sender = TRUE
        WHERE id = message_id
        RETURNING * INTO result_row;
    ELSIF auth.uid() = msg_receiver_id THEN
        UPDATE public.messages
        SET deleted_for_receiver = TRUE
        WHERE id = message_id
        RETURNING * INTO result_row;
    ELSE
        RAISE EXCEPTION 'Permission denied';
    END IF;
    
    RETURN row_to_json(result_row);
END;
$$;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.edit_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message_for_everyone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message_for_me(UUID) TO authenticated;

-- Step 8: Enable RLS if not already enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Functions created: edit_message, delete_message_for_everyone, delete_message_for_me';
END $$;
