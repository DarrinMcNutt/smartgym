-- Migration: Create Workout Plans System
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create workout_plans table
CREATE TABLE IF NOT EXISTS public.workout_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    week_range TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create plan_exercises table
CREATE TABLE IF NOT EXISTS public.plan_exercises (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE NOT NULL,
    exercise_name TEXT NOT NULL,
    sets INTEGER NOT NULL DEFAULT 3,
    reps INTEGER NOT NULL DEFAULT 10,
    weight FLOAT DEFAULT 0,
    rest_time INTEGER DEFAULT 60, -- in seconds
    notes TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for workout_plans
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- Enable RLS for plan_exercises
ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_plans

-- Coaches can view plans they created
CREATE POLICY "Coaches can view their own plans" ON public.workout_plans
    FOR SELECT USING (
        coach_id = auth.uid()
    );

-- Athletes can view plans assigned to them
CREATE POLICY "Athletes can view their assigned plans" ON public.workout_plans
    FOR SELECT USING (
        athlete_id = auth.uid()
    );

-- Admins can view all plans
CREATE POLICY "Admins can view all plans" ON public.workout_plans
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- Coaches can create plans for their assigned athletes
CREATE POLICY "Coaches can create plans for their athletes" ON public.workout_plans
    FOR INSERT WITH CHECK (
        coach_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = athlete_id 
            AND selected_coach_id = auth.uid()::text
        )
    );

-- Coaches can update their own plans
CREATE POLICY "Coaches can update their own plans" ON public.workout_plans
    FOR UPDATE USING (
        coach_id = auth.uid()
    );

-- Coaches can delete their own plans
CREATE POLICY "Coaches can delete their own plans" ON public.workout_plans
    FOR DELETE USING (
        coach_id = auth.uid()
    );

-- Admins can do everything
CREATE POLICY "Admins can manage all plans" ON public.workout_plans
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- RLS Policies for plan_exercises

-- Users can view exercises if they can view the plan
CREATE POLICY "Users can view exercises of accessible plans" ON public.plan_exercises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans 
            WHERE id = plan_id 
            AND (coach_id = auth.uid() OR athlete_id = auth.uid())
        )
    );

-- Coaches can insert exercises for their plans
CREATE POLICY "Coaches can add exercises to their plans" ON public.plan_exercises
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_plans 
            WHERE id = plan_id 
            AND coach_id = auth.uid()
        )
    );

-- Coaches can update exercises in their plans
CREATE POLICY "Coaches can update exercises in their plans" ON public.plan_exercises
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans 
            WHERE id = plan_id 
            AND coach_id = auth.uid()
        )
    );

-- Athletes can update completion status only
CREATE POLICY "Athletes can mark exercises complete" ON public.plan_exercises
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans 
            WHERE id = plan_id 
            AND athlete_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_plans 
            WHERE id = plan_id 
            AND athlete_id = auth.uid()
        )
    );

-- Coaches can delete exercises from their plans
CREATE POLICY "Coaches can delete exercises from their plans" ON public.plan_exercises
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans 
            WHERE id = plan_id 
            AND coach_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_plans_coach_id ON public.workout_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_athlete_id ON public.workout_plans(athlete_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_date ON public.workout_plans(date);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan_id ON public.plan_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_completed ON public.plan_exercises(completed);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_workout_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_workout_plans_timestamp
    BEFORE UPDATE ON public.workout_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_workout_plan_timestamp();

-- Function to mark exercise as completed
CREATE OR REPLACE FUNCTION public.mark_exercise_complete(
    exercise_id UUID,
    is_completed BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.plan_exercises
    SET 
        completed = is_completed,
        completed_at = CASE 
            WHEN is_completed THEN timezone('utc'::text, now())
            ELSE NULL
        END
    WHERE id = exercise_id
      AND EXISTS (
          SELECT 1 FROM public.workout_plans 
          WHERE id = plan_id 
          AND athlete_id = auth.uid()
      );
      
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Exercise not found or you do not have permission';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.mark_exercise_complete(UUID, BOOLEAN) TO authenticated;
