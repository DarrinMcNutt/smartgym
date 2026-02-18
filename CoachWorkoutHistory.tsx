import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, Dumbbell, User, CheckCircle, Circle } from 'lucide-react';
import { getWorkoutPlansForCoach } from '../services/workoutPlanService';
import { WorkoutPlan } from '../types';
import { format } from 'date-fns';
import { supabase } from '../services/supabaseClient';

interface CoachWorkoutHistoryProps {
    coachId: string;
    athleteId?: string; // Optional: filter by specific athlete
    onBack?: () => void;
}

export const CoachWorkoutHistory: React.FC<CoachWorkoutHistoryProps> = ({
    coachId,
    athleteId,
    onBack
}) => {
    const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
    const [athletes, setAthletes] = useState<any[]>([]);
    const [selectedAthleteId, setSelectedAthleteId] = useState<string | undefined>(athleteId);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAthletes();
    }, [coachId]);

    useEffect(() => {
        if (selectedAthleteId) {
            fetchWorkoutPlans();
        }
    }, [selectedAthleteId]);

    const fetchAthletes = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('selected_coach_id', coachId);

        if (data) {
            setAthletes(data);
            if (!selectedAthleteId && data.length > 0) {
                setSelectedAthleteId(data[0].id);
            }
        }
    };

    const fetchWorkoutPlans = async () => {
        if (!selectedAthleteId) return;

        setLoading(true);
        const { data } = await getWorkoutPlansForCoach(coachId, selectedAthleteId);

        if (data) {
            setWorkoutPlans(data);
        }
        setLoading(false);
    };

    const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

    const getCompletionPercentage = (plan: WorkoutPlan) => {
        if (plan.exercises.length === 0) return 0;
        const completed = plan.exercises.filter(ex => ex.completed).length;
        return Math.round((completed / plan.exercises.length) * 100);
    };

    return (
        <div className="pb-24 animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-3">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-white" />
                    </button>
                )}
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white">Workout Plans History</h1>
                    <p className="text-zinc-400 text-sm">View assigned workout plans</p>
                </div>
            </div>

            {/* Athlete Selector */}
            <div className="bg-zinc-900 rounded-3xl p-4 border border-zinc-800">
                <h3 className="text-white font-bold mb-3 flex items-center">
                    <User size={18} className="mr-2 text-lime-400" />
                    Select Athlete
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {athletes.map((athlete) => (
                        <button
                            key={athlete.id}
                            onClick={() => setSelectedAthleteId(athlete.id)}
                            className={`p-3 rounded-xl transition-all text-left ${selectedAthleteId === athlete.id
                                    ? 'bg-lime-400 text-black'
                                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                                }`}
                        >
                            <div className="flex items-center space-x-2">
                                <img
                                    src={athlete.avatar_url || `https://i.pravatar.cc/150?u=${athlete.id}`}
                                    alt={athlete.name}
                                    className="w-8 h-8 rounded-full"
                                />
                                <span className="font-bold text-sm truncate">{athlete.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Workout Plans List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-10 h-10 border-4 border-lime-400/20 border-t-lime-400 rounded-full animate-spin"></div>
                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Loading plans...</p>
                </div>
            ) : workoutPlans.length === 0 ? (
                <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl p-12 text-center">
                    <Calendar size={48} className="text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-lg mb-2">No Workout Plans</h3>
                    <p className="text-zinc-500 text-sm">
                        {selectedAthlete
                            ? `No workout plans assigned to ${selectedAthlete.name} yet.`
                            : 'Select an athlete to view their workout plans.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-white font-bold flex items-center">
                        <Dumbbell size={18} className="mr-2 text-lime-400" />
                        {selectedAthlete?.name}'s Workout Plans ({workoutPlans.length})
                    </h3>

                    {workoutPlans.map((plan) => {
                        const completionPercentage = getCompletionPercentage(plan);
                        const isCompleted = completionPercentage === 100;

                        return (
                            <div
                                key={plan.id}
                                className={`bg-zinc-900 border rounded-3xl p-5 transition-all ${isCompleted
                                        ? 'border-lime-500/30 bg-lime-900/10'
                                        : 'border-zinc-800'
                                    }`}
                            >
                                {/* Plan Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <Calendar size={16} className="text-lime-400" />
                                            <h4 className="text-white font-bold">
                                                {format(new Date(plan.date), 'EEEE, MMMM d, yyyy')}
                                            </h4>
                                        </div>
                                        {plan.notes && (
                                            <p className="text-zinc-400 text-sm mt-2">{plan.notes}</p>
                                        )}
                                    </div>
                                    {isCompleted && (
                                        <div className="bg-lime-400/10 text-lime-400 px-3 py-1 rounded-full text-xs font-bold">
                                            ✓ Completed
                                        </div>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-zinc-400 text-xs font-bold">Progress</span>
                                        <span className="text-lime-400 text-xs font-bold">
                                            {plan.exercises.filter(ex => ex.completed).length} / {plan.exercises.length} Exercises
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-lime-400 transition-all duration-500"
                                            style={{ width: `${completionPercentage}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Exercises List */}
                                <div className="space-y-2">
                                    {plan.exercises.map((exercise) => (
                                        <div
                                            key={exercise.id}
                                            className={`flex items-center justify-between p-3 rounded-xl ${exercise.completed
                                                    ? 'bg-lime-500/10 border border-lime-500/20'
                                                    : 'bg-zinc-800/50'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3 flex-1">
                                                {exercise.completed ? (
                                                    <CheckCircle size={18} className="text-lime-400" />
                                                ) : (
                                                    <Circle size={18} className="text-zinc-600" />
                                                )}
                                                <div className="flex-1">
                                                    <h5 className={`font-bold text-sm ${exercise.completed ? 'text-lime-400' : 'text-white'
                                                        }`}>
                                                        {exercise.exerciseName}
                                                    </h5>
                                                    <p className="text-zinc-500 text-xs">
                                                        {exercise.sets} sets × {exercise.reps} reps
                                                        {exercise.weight && exercise.weight > 0 && ` • ${exercise.weight}kg`}
                                                    </p>
                                                </div>
                                            </div>
                                            {exercise.completedAt && (
                                                <span className="text-zinc-500 text-[10px]">
                                                    {format(new Date(exercise.completedAt), 'HH:mm')}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
