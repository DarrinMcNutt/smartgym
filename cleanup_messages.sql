-- 1. Enable pg_cron if available (optional, depends on your Supabase plan)
-- Or you can run this manually/via Edge Function
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create the cleanup function
CREATE OR REPLACE FUNCTION delete_old_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM public.messages
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. To automate this, go to Supabase -> Database -> Webhooks OR 
-- Use a Cron Job if your plan supports it:
-- SELECT cron.schedule('delete-every-hour', '0 * * * *', 'SELECT delete_old_messages()');

-- Note: If you don't have pg_cron, you can simply run:
-- SELECT delete_old_messages();
-- manually from the SQL Editor whenever you want to clean up.
