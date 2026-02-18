import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Search } from 'lucide-react';
import { createWorkoutPlan } from '../services/workoutPlanService';
import { PlanExercise } from '../types';

interface WorkoutPlanCreatorProps {
    coachId: string;
    athleteId: string;
    athleteName: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface ExerciseTemplate {
    id: string;
    name: string;
    defaultSets: number;
    defaultReps: number;
    defaultWeight: number;
}

const EXERCISE_LIBRARY: ExerciseTemplate[] = [
    { id: '1', name: 'Barbell Squat', defaultSets: 4, defaultReps: 8, defaultWeight: 60 },
    { id: '2', name: 'Bench Press', defaultSets: 3, defaultReps: 10, defaultWeight: 50 },
    { id: '3', name: 'Deadlift', defaultSets: 3, defaultReps: 5, defaultWeight: 80 },
    { id: '4', name: 'Pull Ups', defaultSets: 3, defaultReps: 12, defaultWeight: 0 },
    { id: '5', name: 'Dumbbell Lunge', defaultSets: 3, defaultReps: 12, defaultWeight: 20 },
    { id: '6', name: 'Plank', defaultSets: 3, defaultReps: 60, defaultWeight: 0 },
    { id: '7', name: 'Push Ups', defaultSets: 3, defaultReps: 15, defaultWeight: 0 },
    { id: '8', name: 'Lat Pulldown', defaultSets: 3, defaultReps: 12, defaultWeight: 40 },
    { id: '9', name: 'Leg Press', defaultSets: 4, defaultReps: 12, defaultWeight: 100 },
    { id: '10', name: 'Shoulder Press', defaultSets: 3, defaultReps: 10, defaultWeight: 30 },
    { id: '11', name: 'Bicep Curls', defaultSets: 3, defaultReps: 12, defaultWeight: 15 },
    { id: '12', name: 'Tricep Dips', defaultSets: 3, defaultReps: 12, defaultWeight: 0 },
    { id: '13', name: 'Leg Curls', defaultSets: 3, defaultReps: 12, defaultWeight: 30 },
    { id: '14', name: 'Calf Raises', defaultSets: 4, defaultReps: 15, defaultWeight: 40 },
    { id: '15', name: 'Cable Rows', defaultSets: 3, defaultReps: 12, defaultWeight: 35 },
];

export const WorkoutPlanCreator: React.FC<WorkoutPlanCreatorProps> = ({
    coachId,
    athleteId,
    athleteName,
    onClose,
    onSuccess
}) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [exercises, setExercises] = useState<Omit<PlanExercise, 'id' | 'planId' | 'completed' | 'completedAt'>[]>([]);
    const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const filteredExercises = EXERCISE_LIBRARY.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const addExercise = (template: ExerciseTemplate) => {
        const newExercise: Omit<PlanExercise, 'id' | 'planId' | 'completed' | 'completedAt'> = {
            exerciseName: template.name,
            sets: template.defaultSets,
            reps: template.defaultReps,
            weight: template.defaultWeight,
            restTime: 60,
            notes: '',
            orderIndex: exercises.length
        };
        setExercises([...exercises, newExercise]);
        setShowExerciseLibrary(false);
        setSearchQuery('');
    };

    const removeExercise = (index: number) => {
        setExercises(exercises.filter((_, i) => i !== index));
    };

    const updateExercise = (index: number, field: string, value: any) => {
        const updated = [...exercises];
        updated[index] = { ...updated[index], [field]: value };
        setExercises(updated);
    };

    const handleSave = async () => {
        if (exercises.length === 0) {
            alert('Please add at least one exercise');
            return;
        }

        setIsSaving(true);
        try {
            const { data, error } = await createWorkoutPlan(
                coachId,
                athleteId,
                selectedDate,
                exercises,
                notes
            );

            if (error) throw error;

            alert('Workout plan created successfully!');
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error creating workout plan:', err);
            alert('Failed to create workout plan');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-zinc-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-zinc-800 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Create Workout Plan</h2>
                        <p className="text-zinc-400 text-sm mt-1">For {athleteName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Date Selection */}
                    <div>
                        <label className="block text-white font-bold mb-2">Target Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 outline-none focus:border-lime-400 transition-colors"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-white font-bold mb-2">Coach Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any special instructions or notes..."
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 outline-none focus:border-lime-400 transition-colors resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Exercises List */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-white font-bold">Exercises ({exercises.length})</label>
                            <button
                                onClick={() => setShowExerciseLibrary(true)}
                                className="bg-lime-400 text-black font-bold px-4 py-2 rounded-xl hover:brightness-110 transition-all flex items-center space-x-2"
                            >
                                <Plus size={18} />
                                <span>Add Exercise</span>
                            </button>
                        </div>

                        {exercises.length === 0 ? (
                            <div className="bg-zinc-800/50 border border-dashed border-zinc-700 rounded-2xl p-8 text-center">
                                <p className="text-zinc-500">No exercises added yet. Click "Add Exercise" to start building the plan.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {exercises.map((ex, index) => (
                                    <div key={index} className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <h4 className="text-white font-bold text-lg">{ex.exerciseName}</h4>
                                            <button
                                                onClick={() => removeExercise(index)}
                                                className="text-red-400 hover:text-red-300 p-1"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-4 gap-3">
                                            <div>
                                                <label className="text-zinc-400 text-xs font-bold block mb-1">Sets</label>
                                                <input
                                                    type="number"
                                                    value={ex.sets}
                                                    onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value) || 0)}
                                                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-center outline-none focus:border-lime-400"
                                                    min="1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-zinc-400 text-xs font-bold block mb-1">Reps</label>
                                                <input
                                                    type="number"
                                                    value={ex.reps}
                                                    onChange={(e) => updateExercise(index, 'reps', parseInt(e.target.value) || 0)}
                                                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-center outline-none focus:border-lime-400"
                                                    min="1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-zinc-400 text-xs font-bold block mb-1">Weight (kg)</label>
                                                <input
                                                    type="number"
                                                    value={ex.weight || 0}
                                                    onChange={(e) => updateExercise(index, 'weight', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-center outline-none focus:border-lime-400"
                                                    min="0"
                                                    step="2.5"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-zinc-400 text-xs font-bold block mb-1">Rest (sec)</label>
                                                <input
                                                    type="number"
                                                    value={ex.restTime}
                                                    onChange={(e) => updateExercise(index, 'restTime', parseInt(e.target.value) || 60)}
                                                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-center outline-none focus:border-lime-400"
                                                    min="0"
                                                    step="15"
                                                />
                                            </div>
                                        </div>

                                        <input
                                            type="text"
                                            value={ex.notes || ''}
                                            onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                                            placeholder="Exercise notes (optional)..."
                                            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-lime-400"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-800 flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || exercises.length === 0}
                        className="flex-1 bg-lime-400 hover:brightness-110 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                        <Save size={18} />
                        <span>{isSaving ? 'Saving...' : 'Save Plan'}</span>
                    </button>
                </div>
            </div>

            {/* Exercise Library Modal */}
            {showExerciseLibrary && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-10">
                    <div className="bg-zinc-900 rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden border border-zinc-800 shadow-2xl flex flex-col">
                        <div className="p-4 border-b border-zinc-800">
                            <div className="flex items-center space-x-2 bg-zinc-800 rounded-xl px-4 py-3">
                                <Search size={18} className="text-zinc-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search exercises..."
                                    className="flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredExercises.map((ex) => (
                                <button
                                    key={ex.id}
                                    onClick={() => addExercise(ex)}
                                    className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl p-4 text-left transition-all group"
                                >
                                    <h4 className="text-white font-bold group-hover:text-lime-400 transition-colors">{ex.name}</h4>
                                    <p className="text-zinc-500 text-xs mt-1">
                                        {ex.defaultSets} sets × {ex.defaultReps} reps
                                        {ex.defaultWeight > 0 && ` • ${ex.defaultWeight}kg`}
                                    </p>
                                </button>
                            ))}
                        </div>

                        <div className="p-4 border-t border-zinc-800">
                            <button
                                onClick={() => {
                                    setShowExerciseLibrary(false);
                                    setSearchQuery('');
                                }}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
