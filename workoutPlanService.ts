import { supabase } from './supabaseClient';
import { WorkoutPlan, PlanExercise } from '../types';

/**
 * Create a new workout plan with exercises
 */
export async function createWorkoutPlan(
    coachId: string,
    athleteId: string,
    date: string,
    exercises: Omit<PlanExercise, 'id' | 'planId' | 'completed' | 'completedAt'>[],
    notes?: string,
    weekRange?: string
): Promise<{ data: WorkoutPlan | null; error: any }> {
    try {
        // First, create the workout plan
        const { data: plan, error: planError } = await supabase
            .from('workout_plans')
            .insert({
                coach_id: coachId,
                athlete_id: athleteId,
                date,
                week_range: weekRange,
                notes
            })
            .select()
            .single();

        if (planError) throw planError;

        // Then, create the exercises
        const exercisesToInsert = exercises.map((ex, index) => ({
            plan_id: plan.id,
            exercise_name: ex.exerciseName,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight || 0,
            rest_time: ex.restTime,
            notes: ex.notes,
            order_index: index
        }));

        const { data: insertedExercises, error: exercisesError } = await supabase
            .from('plan_exercises')
            .insert(exercisesToInsert)
            .select();

        if (exercisesError) throw exercisesError;

        // Format the response
        const formattedPlan: WorkoutPlan = {
            id: plan.id,
            coachId: plan.coach_id,
            athleteId: plan.athlete_id,
            date: plan.date,
            weekRange: plan.week_range,
            notes: plan.notes,
            exercises: insertedExercises.map(ex => ({
                id: ex.id,
                planId: ex.plan_id,
                exerciseName: ex.exercise_name,
                sets: ex.sets,
                reps: ex.reps,
                weight: ex.weight,
                restTime: ex.rest_time,
                notes: ex.notes,
                orderIndex: ex.order_index,
                completed: ex.completed,
                completedAt: ex.completed_at ? new Date(ex.completed_at) : undefined
            })),
            createdAt: new Date(plan.created_at),
            updatedAt: new Date(plan.updated_at)
        };

        return { data: formattedPlan, error: null };
    } catch (error) {
        console.error('Error creating workout plan:', error);
        return { data: null, error };
    }
}

/**
 * Get workout plans for an athlete within a date range
 */
export async function getWorkoutPlansForAthlete(
    athleteId: string,
    startDate: string,
    endDate: string
): Promise<{ data: WorkoutPlan[] | null; error: any }> {
    try {
        const { data: plans, error: plansError } = await supabase
            .from('workout_plans')
            .select(`
        *,
        plan_exercises (*)
      `)
            .eq('athlete_id', athleteId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (plansError) throw plansError;

        const formattedPlans: WorkoutPlan[] = plans.map(plan => ({
            id: plan.id,
            coachId: plan.coach_id,
            athleteId: plan.athlete_id,
            date: plan.date,
            weekRange: plan.week_range,
            notes: plan.notes,
            exercises: (plan.plan_exercises || [])
                .map((ex: any) => ({
                    id: ex.id,
                    planId: ex.plan_id,
                    exerciseName: ex.exercise_name,
                    sets: ex.sets,
                    reps: ex.reps,
                    weight: ex.weight,
                    restTime: ex.rest_time,
                    notes: ex.notes,
                    orderIndex: ex.order_index,
                    completed: ex.completed,
                    completedAt: ex.completed_at ? new Date(ex.completed_at) : undefined
                }))
                .sort((a: any, b: any) => a.orderIndex - b.orderIndex),
            createdAt: new Date(plan.created_at),
            updatedAt: new Date(plan.updated_at)
        }));

        return { data: formattedPlans, error: null };
    } catch (error) {
        console.error('Error fetching workout plans:', error);
        return { data: null, error };
    }
}

/**
 * Get a single workout plan by ID
 */
export async function getWorkoutPlanById(
    planId: string
): Promise<{ data: WorkoutPlan | null; error: any }> {
    try {
        const { data: plan, error: planError } = await supabase
            .from('workout_plans')
            .select(`
        *,
        plan_exercises (*)
      `)
            .eq('id', planId)
            .single();

        if (planError) throw planError;

        const formattedPlan: WorkoutPlan = {
            id: plan.id,
            coachId: plan.coach_id,
            athleteId: plan.athlete_id,
            date: plan.date,
            weekRange: plan.week_range,
            notes: plan.notes,
            exercises: (plan.plan_exercises || [])
                .map((ex: any) => ({
                    id: ex.id,
                    planId: ex.plan_id,
                    exerciseName: ex.exercise_name,
                    sets: ex.sets,
                    reps: ex.reps,
                    weight: ex.weight,
                    restTime: ex.rest_time,
                    notes: ex.notes,
                    orderIndex: ex.order_index,
                    completed: ex.completed,
                    completedAt: ex.completed_at ? new Date(ex.completed_at) : undefined
                }))
                .sort((a: any, b: any) => a.orderIndex - b.orderIndex),
            createdAt: new Date(plan.created_at),
            updatedAt: new Date(plan.updated_at)
        };

        return { data: formattedPlan, error: null };
    } catch (error) {
        console.error('Error fetching workout plan:', error);
        return { data: null, error };
    }
}

/**
 * Update a workout plan
 */
export async function updateWorkoutPlan(
    planId: string,
    updates: {
        date?: string;
        notes?: string;
        weekRange?: string;
    }
): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
        .from('workout_plans')
        .update({
            date: updates.date,
            notes: updates.notes,
            week_range: updates.weekRange
        })
        .eq('id', planId)
        .select()
        .single();

    return { data, error };
}

/**
 * Delete a workout plan
 */
export async function deleteWorkoutPlan(planId: string): Promise<{ error: any }> {
    const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId);

    return { error };
}

/**
 * Mark an exercise as complete/incomplete
 */
export async function markExerciseComplete(
    exerciseId: string,
    completed: boolean
): Promise<{ error: any }> {
    const { error } = await supabase.rpc('mark_exercise_complete', {
        exercise_id: exerciseId,
        is_completed: completed
    });

    return { error };
}

/**
 * Add an exercise to an existing plan
 */
export async function addExerciseToPlan(
    planId: string,
    exercise: Omit<PlanExercise, 'id' | 'planId' | 'completed' | 'completedAt'>
): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
        .from('plan_exercises')
        .insert({
            plan_id: planId,
            exercise_name: exercise.exerciseName,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight || 0,
            rest_time: exercise.restTime,
            notes: exercise.notes,
            order_index: exercise.orderIndex
        })
        .select()
        .single();

    return { data, error };
}

/**
 * Remove an exercise from a plan
 */
export async function removeExerciseFromPlan(exerciseId: string): Promise<{ error: any }> {
    const { error } = await supabase
        .from('plan_exercises')
        .delete()
        .eq('id', exerciseId);

    return { error };
}

/**
 * Subscribe to workout plan changes for an athlete
 */
export function subscribeToWorkoutPlans(
    athleteId: string,
    callback: (payload: any) => void
) {
    const channel = supabase
        .channel(`workout_plans:${athleteId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'workout_plans',
                filter: `athlete_id=eq.${athleteId}`
            },
            callback
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'plan_exercises'
            },
            callback
        )
        .subscribe();

    return channel;
}

// Export coach-specific functions
export { getWorkoutPlansForCoach } from './coachWorkoutService';
