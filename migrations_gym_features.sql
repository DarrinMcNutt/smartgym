-- Migration: Add Gym Core Features (Attendance & Membership)

-- 1. Create Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for Attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Policies for Attendance
CREATE POLICY "Admins can view all attendance." ON public.attendance
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

CREATE POLICY "Users can view their own attendance." ON public.attendance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can record attendance." ON public.attendance
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- 2. Add Membership Fields to Profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='membership_start') THEN
        ALTER TABLE public.profiles ADD COLUMN membership_start TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='membership_end') THEN
        ALTER TABLE public.profiles ADD COLUMN membership_end TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_check_in') THEN
        ALTER TABLE public.profiles ADD COLUMN last_check_in TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Function to handle manual check-in
CREATE OR REPLACE FUNCTION public.record_attendance(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Only allow if the requester is an ADMIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
        INSERT INTO public.attendance (user_id) VALUES (target_user_id);
        
        UPDATE public.profiles 
        SET last_check_in = timezone('utc'::text, now())
        WHERE id = target_user_id;
    ELSE
        RAISE EXCEPTION 'Only admins can record attendance';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
