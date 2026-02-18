-- Migration: Add Edit/Delete Support to Messages Table
-- Run this in your Supabase SQL Editor

-- Add new columns to messages table for edit/delete functionality
DO $$ 
BEGIN 
    -- Add edited_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='edited_at') THEN
        ALTER TABLE public.messages ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add edited_text column (stores original text before edit)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='edited_text') THEN
        ALTER TABLE public.messages ADD COLUMN edited_text TEXT;
    END IF;
    
    -- Add is_deleted column (soft delete flag)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='is_deleted') THEN
        ALTER TABLE public.messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add deleted_for_sender column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='deleted_for_sender') THEN
        ALTER TABLE public.messages ADD COLUMN deleted_for_sender BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add deleted_for_receiver column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='deleted_for_receiver') THEN
        ALTER TABLE public.messages ADD COLUMN deleted_for_receiver BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add deleted_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='messages' AND column_name='deleted_at') THEN
        ALTER TABLE public.messages ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create index for better query performance on deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON public.messages(edited_at);

-- Function to edit a message
CREATE OR REPLACE FUNCTION public.edit_message(
    message_id UUID,
    new_text TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Only allow sender to edit their own message
    UPDATE public.messages
    SET 
        edited_text = CASE WHEN edited_text IS NULL THEN text ELSE edited_text END,
        text = new_text,
        edited_at = timezone('utc'::text, now())
    WHERE id = message_id
      AND sender_id = auth.uid()
      AND is_deleted = FALSE;
      
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found or you do not have permission to edit it';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete message for everyone
CREATE OR REPLACE FUNCTION public.delete_message_for_everyone(
    message_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Only allow sender to delete for everyone
    UPDATE public.messages
    SET 
        is_deleted = TRUE,
        deleted_at = timezone('utc'::text, now())
    WHERE id = message_id
      AND sender_id = auth.uid();
      
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found or you do not have permission to delete it';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete message for current user only
CREATE OR REPLACE FUNCTION public.delete_message_for_me(
    message_id UUID
)
RETURNS VOID AS $$
DECLARE
    msg_sender_id UUID;
    msg_receiver_id UUID;
BEGIN
    -- Get message details
    SELECT sender_id, receiver_id INTO msg_sender_id, msg_receiver_id
    FROM public.messages
    WHERE id = message_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found';
    END IF;
    
    -- Update appropriate flag based on who is deleting
    IF auth.uid() = msg_sender_id THEN
        UPDATE public.messages
        SET deleted_for_sender = TRUE
        WHERE id = message_id;
    ELSIF auth.uid() = msg_receiver_id THEN
        UPDATE public.messages
        SET deleted_for_receiver = TRUE
        WHERE id = message_id;
    ELSE
        RAISE EXCEPTION 'You do not have permission to delete this message';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.edit_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message_for_everyone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_message_for_me(UUID) TO authenticated;
