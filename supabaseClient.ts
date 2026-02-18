import { createClient } from '@supabase/supabase-js';

// TO BE CONFIGURED: Add your Supabase URL and Anon Key here
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
    console.warn('⚠️ Supabase credentials missing! Check your .env or .env.local file.');
} else {
    console.log('🚀 Supabase client initialized with URL:', supabaseUrl);
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

export const getWorkouts = async (athleteId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase
        .from('workouts')
        .select(`
            *,
            exercises:workout_exercises(*)
        `)
        .eq('athlete_id', athleteId)
        .gte('date', startDate)
        .lte('date', endDate);

    return { data, error };
};

export const saveWorkout = async (athleteId: string, date: string, exercises: any[]) => {
    // 1. Check if workout exists for this date
    const { data: existingWorkout } = await supabase
        .from('workouts')
        .select('id')
        .eq('athlete_id', athleteId)
        .eq('date', date)
        .single();

    let workoutId;

    if (existingWorkout) {
        workoutId = existingWorkout.id;
    } else {
        // 2. Create workout if not exists
        const { data: newWorkout, error: wError } = await supabase
            .from('workouts')
            .insert({ athlete_id: athleteId, date })
            .select()
            .single();

        if (wError) return { error: wError };
        workoutId = newWorkout.id;
    }

    // 3. Delete existing exercises (to sync) or handle differently?
    // For simplicity, we delete existing and re-insert
    await supabase.from('workout_exercises').delete().eq('workout_id', workoutId);

    // 4. Insert new exercises
    const exercisesToInsert = exercises.map(ex => ({
        workout_id: workoutId,
        exercise_name: ex.exerciseName,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        completed: ex.completed
    }));

    const { data: inserted, error: iError } = await supabase
        .from('workout_exercises')
        .insert(exercisesToInsert);

    return { data: inserted, error: iError };
};

export const toggleExerciseStatus = async (exerciseId: string, completed: boolean) => {
    const { data, error } = await supabase
        .from('workout_exercises')
        .update({ completed })
        .eq('id', exerciseId);
    return { data, error };
};

export const checkAndSavePR = async (athleteId: string, exerciseName: string, weight: number) => {
    // 1. Fetch current PR
    const { data: currentPR, error } = await supabase
        .from('personal_records')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('exercise_name', exerciseName)
        .maybeSingle();

    if (error) {
        console.error('Error fetching PR:', error);
        return { isNewPR: false };
    }

    // 2. Check if new weight is higher
    if (!currentPR || weight > (currentPR.max_weight || 0)) {
        const { error: upsertError } = await supabase
            .from('personal_records')
            .upsert({
                athlete_id: athleteId,
                exercise_name: exerciseName,
                max_weight: weight,
                date_achieved: new Date().toISOString()
            }, { onConflict: 'id' }); // Fallback on upsert logic if ID present, but here we insert new or update based on query?

        // Simplified Logic: if exists update, else insert
        if (currentPR) {
            await supabase.from('personal_records').update({ max_weight: weight, date_achieved: new Date() }).eq('id', currentPR.id);
        } else {
            await supabase.from('personal_records').insert({ athlete_id: athleteId, exercise_name: exerciseName, max_weight: weight });
        }

        return { isNewPR: true, oldWeight: currentPR?.max_weight || 0 };
    }

    return { isNewPR: false };
};

export const getPersonalRecords = async (athleteId: string) => {
    const { data } = await supabase.from('personal_records').select('*').eq('athlete_id', athleteId).order('max_weight', { ascending: false });
    return { data };
};

export const getWorkoutTemplates = async (coachId: string) => {
    return await supabase.from('workout_templates').select('*').eq('coach_id', coachId);
};

export const getAllSubscriptions = async () => {
    return await supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
};

export const getAllAthletesWithStatus = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'ATHLETE')
        .order('name', { ascending: true });

    return { data, error };
};
