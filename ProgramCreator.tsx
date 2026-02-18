import React, { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Calendar, Clock, Dumbbell, Save, X, Plus, Trash2, Utensils, Flame } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface ProgramCreatorProps {
    athleteId: string;
    athleteName: string;
    initialType?: 'Bulking' | 'Cutting' | 'Beginner';
    onClose: () => void;
    onSuccess: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DayPlan {
    day: string;
    workoutName: string;
    exercises: any[];
    meals: any[];
    timerSettings: {
        work: number;
        rest: number;
        rounds: number;
    };
    isRestDay: boolean;
}

export const ProgramCreator: React.FC<ProgramCreatorProps> = ({ athleteId, athleteName, initialType = 'Bulking', onClose, onSuccess }) => {
    const [programName, setProgramName] = useState(`${initialType} Plan for ${athleteName}`);
    const [durationWeeks, setDurationWeeks] = useState(4);

    // Initialize Schedule
    const [schedule, setSchedule] = useState<DayPlan[]>(DAYS.map(day => ({
        day,
        workoutName: '',
        exercises: [],
        meals: [],
        timerSettings: { work: 45, rest: 60, rounds: 3 },
        isRestDay: false
    })));

    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    // Mock Presets for Drag & Drop
    const presets = [
        { id: 'p1', name: 'Push Day', type: 'workout', exercises: ['Bench Press', 'Overhead Press', 'Tricep Extensions'] },
        { id: 'p2', name: 'Pull Day', type: 'workout', exercises: ['Deadlift', 'Pull Ups', 'Bicep Curls'] },
        { id: 'p3', name: 'Leg Day', type: 'workout', exercises: ['Squats', 'Leg Press', 'Lunges'] },
        { id: 'p4', name: 'Cardio & Abs', type: 'workout', exercises: ['Running', 'Plank', 'Crunches'] },
        { id: 'm1', name: 'High Protein', type: 'meal', items: ['Chicken Breast', 'Rice', 'Broccoli'] },
        { id: 'm2', name: 'Carb Load', type: 'meal', items: ['Pasta', 'Banana', 'Oats'] },
    ];

    const handleSaveProgram = async () => {
        // Here we would save to Supabase
        // For now, we'll just simulate a save
        // In a real app, we'd insert into a 'programs' table and assign it

        // Simulating API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Notify parent
        onSuccess();
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-fade-in text-white">
                {/* Header */}
                <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold flex items-center">
                            <span className="bg-lime-400 text-black px-2 py-1 rounded mr-3 text-sm">PRO</span>
                            Program Creator: <input value={programName} onChange={e => setProgramName(e.target.value)} className="bg-transparent border-b border-zinc-700 ml-2 focus:border-lime-400 outline-none w-64" />
                        </h2>
                        <p className="text-zinc-500 text-xs mt-1">Assigning to <span className="text-white font-bold">{athleteName}</span> • {durationWeeks} Weeks</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><X /></button>
                        <button onClick={handleSaveProgram} className="bg-lime-400 text-black px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform flex items-center">
                            <Save size={18} className="mr-2" /> Save & Assign
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar - Draggables */}
                    <div className="w-64 bg-zinc-900/50 border-r border-zinc-800 p-4 overflow-y-auto">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Presets</h3>

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-bold text-white mb-2 flex items-center"><Dumbbell size={14} className="mr-2 text-lime-400" /> Workouts</h4>
                                <div className="space-y-2">
                                    {presets.filter(p => p.type === 'workout').map(p => (
                                        <div key={p.id} draggable className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 cursor-grab hover:border-lime-400 transition-colors">
                                            <div className="font-bold text-sm">{p.name}</div>
                                            <div className="text-[10px] text-zinc-500">{p.exercises.length} Exercises</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-white mb-2 flex items-center"><Utensils size={14} className="mr-2 text-orange-400" /> Meals</h4>
                                <div className="space-y-2">
                                    {presets.filter(p => p.type === 'meal').map(p => (
                                        <div key={p.id} draggable className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 cursor-grab hover:border-orange-400 transition-colors">
                                            <div className="font-bold text-sm">{p.name}</div>
                                            <div className="text-[10px] text-zinc-500">{p.items.join(', ')}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main - Weekly Schedule */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="grid grid-cols-7 gap-4 h-full min-h-[500px]">
                            {schedule.map((day, index) => (
                                <div
                                    key={day.day}
                                    onClick={() => setSelectedDay(day.day)}
                                    className={`rounded-2xl border-2 p-3 flex flex-col transition-all cursor-pointer hover:scale-[1.02] ${selectedDay === day.day ? 'border-lime-400 bg-zinc-800' : 'border-zinc-800 bg-zinc-900'
                                        }`}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-sm text-zinc-400">{day.day}</span>
                                        <button className="text-zinc-600 hover:text-white"><Plus size={14} /></button>
                                    </div>

                                    {day.isRestDay ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                                            <Clock size={24} className="mb-2 opacity-50" />
                                            <span className="text-xs font-bold uppercase">Rest Day</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {day.workoutName ? (
                                                <div className="bg-lime-400/10 border border-lime-400/30 p-2 rounded-lg">
                                                    <div className="text-xs font-bold text-lime-400 truncate">{day.workoutName}</div>
                                                    <div className="text-[10px] text-lime-400/70">{day.exercises.length} Exercises</div>
                                                </div>
                                            ) : (
                                                <div className="h-20 border-2 border-dashed border-zinc-700 rounded-lg flex items-center justify-center text-zinc-700 text-xs font-bold">
                                                    Drop Workout Here
                                                </div>
                                            )}

                                            {day.meals.length > 0 && (
                                                <div className="bg-orange-400/10 border border-orange-400/30 p-2 rounded-lg">
                                                    <div className="text-xs font-bold text-orange-400">{day.meals.length} Meals</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel - Day Details Editor (Only when selected) */}
                    {selectedDay && (
                        <div className="w-80 bg-zinc-900 border-l border-zinc-800 p-6 overflow-y-auto animate-slide-left">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold">{selectedDay} Details</h3>
                                <button onClick={() => setSelectedDay(null)}><X size={18} className="text-zinc-500" /></button>
                            </div>

                            <div className="space-y-6">
                                {/* Timer Settings */}
                                <div className="bg-black p-4 rounded-2xl border border-zinc-800">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center">
                                        <Clock size={12} className="mr-2" /> Timer Config
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-zinc-500 block mb-1">Work (sec)</label>
                                            <input type="number" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-center font-bold" defaultValue={45} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-zinc-500 block mb-1">Rest (sec)</label>
                                            <input type="number" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-center font-bold" defaultValue={60} />
                                        </div>
                                    </div>
                                </div>

                                {/* Exercises List */}
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                                        <span>Exercises</span>
                                        <button className="text-lime-400 hover:text-white"><Plus size={14} /></button>
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="bg-zinc-800 p-3 rounded-xl flex justify-between items-center group">
                                            <span className="text-sm font-medium">Warmup Cardio</span>
                                            <button className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 size={14} /></button>
                                        </div>
                                        <div className="p-4 border-2 border-dashed border-zinc-800 rounded-xl text-center text-zinc-600 text-xs">
                                            Add exercises specific to this day
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DndProvider>
    );
};
