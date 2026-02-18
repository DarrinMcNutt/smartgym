import { supabase } from './supabaseClient';
import { WorkoutPlan } from '../types';

/**
 * Get all workout plans created by a coach for a specific athlete (for coach view)
 */
export async function getWorkoutPlansForCoach(
    coachId: string,
    athleteId?: string
): Promise<{ data: WorkoutPlan[] | null; error: any }> {
    try {
        let query = supabase
            .from('workout_plans')
            .select(`
        *,
        plan_exercises (*)
      `)
            .eq('coach_id', coachId)
            .order('date', { ascending: false });

        if (athleteId) {
            query = query.eq('athlete_id', athleteId);
        }

        const { data: plans, error: plansError } = await query;

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
        console.error('Error fetching coach workout plans:', error);
        return { data: null, error };
    }
}
