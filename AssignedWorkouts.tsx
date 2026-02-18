import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Circle, ChevronLeft, Dumbbell, Clock } from 'lucide-react';
import { getWorkoutPlansForAthlete, markExerciseComplete } from '../services/workoutPlanService';
import { WorkoutPlan } from '../types';
import { format, startOfWeek, addDays } from 'date-fns';
import WorkoutTimer from './WorkoutTimer';

interface AssignedWorkoutsProps {
    athleteId: string;
    onBack?: () => void;
}

export const AssignedWorkouts: React.FC<AssignedWorkoutsProps> = ({ athleteId, onBack }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    useEffect(() => {
        fetchWorkoutPlans();
    }, [athleteId, currentWeekStart]);

    const fetchWorkoutPlans = async () => {
        setLoading(true);
        const startDate = format(currentWeekStart, 'yyyy-MM-dd');
        const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');

        const { data, error } = await getWorkoutPlansForAthlete(athleteId, startDate, endDate);

        if (data) {
            setWorkoutPlans(data);
        }
        setLoading(false);
    };

    const selectedPlan = workoutPlans.find(
        plan => plan.date === format(selectedDate, 'yyyy-MM-dd')
    );

    const handleToggleExercise = async (exerciseId: string, currentStatus: boolean) => {
        const { error } = await markExerciseComplete(exerciseId, !currentStatus);

        if (!error) {
            // Update local state
            setWorkoutPlans(prev =>
                prev.map(plan => ({
                    ...plan,
                    exercises: plan.exercises.map(ex =>
                        ex.id === exerciseId
                            ? { ...ex, completed: !currentStatus, completedAt: !currentStatus ? new Date() : undefined }
                            : ex
                    )
                }))
            );
        }
    };

    const formatRestTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
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
                    <h1 className="text-2xl font-bold text-white">Coach Assigned Workouts</h1>
                    <p className="text-zinc-400 text-sm">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                </div>
            </div>

            {/* Week Calendar */}
            <div className="bg-zinc-900 rounded-3xl p-4 border border-zinc-800">
                <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                        const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                        const hasPlan = workoutPlans.some(plan => plan.date === format(day, 'yyyy-MM-dd'));

                        return (
                            <button
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${isSelected
                                    ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20'
                                    : 'text-zinc-500 hover:bg-zinc-800'
                                    }`}
                            >
                                <span className="text-[10px] font-bold uppercase">{format(day, 'EEE')}</span>
                                <span className={`text-lg font-bold ${isSelected ? 'text-black' : 'text-zinc-400'}`}>
                                    {format(day, 'd')}
                                </span>
                                {hasPlan && !isSelected && (
                                    <div className="w-1 h-1 bg-lime-400 rounded-full mt-1"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Workout Plan Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-10 h-10 border-4 border-lime-400/20 border-t-lime-400 rounded-full animate-spin"></div>
                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Loading workouts...</p>
                </div>
            ) : selectedPlan ? (
                <div className="space-y-4">
                    {/* Plan Header */}
                    {selectedPlan.notes && (
                        <div className="bg-lime-400/10 border border-lime-400/20 rounded-2xl p-4">
                            <h3 className="text-lime-400 font-bold text-sm mb-1">Coach Notes</h3>
                            <p className="text-white text-sm">{selectedPlan.notes}</p>
                        </div>
                    )}

                    {/* Progress Summary */}
                    <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-zinc-400 text-sm font-bold">Progress</span>
                            <span className="text-lime-400 text-sm font-bold">
                                {selectedPlan.exercises.filter(ex => ex.completed).length} / {selectedPlan.exercises.length} Completed
                            </span>
                        </div>
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-lime-400 transition-all duration-500"
                                style={{
                                    width: `${(selectedPlan.exercises.filter(ex => ex.completed).length / selectedPlan.exercises.length) * 100}%`
                                }}
                            ></div>
                        </div>
                    </div>

                    {/* Exercises List */}
                    <div className="space-y-3">
                        <h3 className="text-white font-bold flex items-center">
                            <Dumbbell size={18} className="mr-2 text-lime-400" />
                            Today's Exercises
                        </h3>

                        {selectedPlan.exercises.map((exercise) => (
                            <div
                                key={exercise.id}
                                className={`bg-zinc-900 border rounded-3xl p-4 transition-all ${exercise.completed
                                    ? 'border-lime-500/30 bg-lime-900/10'
                                    : 'border-zinc-800'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h4 className={`font-bold text-lg ${exercise.completed ? 'text-lime-400' : 'text-white'}`}>
                                            {exercise.exerciseName}
                                        </h4>
                                        <div className="flex items-center space-x-3 mt-2 text-zinc-500 text-sm">
                                            <span>{exercise.sets} Sets × {exercise.reps} Reps</span>
                                            {exercise.weight && exercise.weight > 0 && (
                                                <span>• {exercise.weight}kg</span>
                                            )}
                                            <span className="flex items-center">
                                                <Clock size={12} className="mr-1" />
                                                {formatRestTime(exercise.restTime)} rest
                                            </span>
                                        </div>
                                        {exercise.notes && (
                                            <p className="text-zinc-400 text-xs mt-2 italic">{exercise.notes}</p>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleToggleExercise(exercise.id, exercise.completed)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${exercise.completed
                                            ? 'bg-lime-400 border-lime-400 text-black'
                                            : 'border-zinc-600 text-transparent hover:border-lime-400'
                                            }`}
                                    >
                                        {exercise.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-6 text-center p-6 py-20">
                    <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-2">
                        <Calendar size={40} className="text-zinc-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">No Workout Planned</h2>
                        <p className="text-zinc-400">
                            Your coach hasn't assigned a workout for {format(selectedDate, 'EEEE')}.
                        </p>
                        <p className="text-zinc-500 text-sm mt-2">
                            Take a rest day or create your own plan!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
