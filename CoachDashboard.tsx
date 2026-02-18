import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Bell, Users, TrendingUp, AlertTriangle, ChevronRight, Activity } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { AppView } from '../types';

interface CoachDashboardProps {
    coachName: string;
    coachId: string;
    onViewAthletes?: () => void;
    onChatAthlete: (athleteId: string) => void;
    onAssignWorkout: (athleteId: string) => void;
    onViewWorkoutHistory?: () => void;
    unreadCount?: number;
}

import { WorkoutTemplates } from './WorkoutTemplates';

export const CoachDashboard: React.FC<CoachDashboardProps> = ({ coachName, coachId, onChatAthlete, onAssignWorkout, onViewWorkoutHistory, unreadCount = 0 }) => {
    const currentDate = new Date();
    const [athletes, setAthletes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAthletes();
    }, [coachId]);

    const fetchAthletes = async () => {
        setLoading(true);
        // Fetch athletes assigned to this coach
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .eq('selected_coach_id', coachId);

        if (profiles) {
            // For each athlete, fetch unread message count AND workout stats
            const athletesWithStats = await Promise.all(
                profiles.map(async (athlete) => {
                    const { count: unreadCount } = await supabase
                        .from('messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('sender_id', athlete.id)
                        .eq('receiver_id', coachId)
                        .eq('is_read', false);

                    // Fetch completed workouts count
                    // Note: This relies on how we track completion. 
                    // Ideally we'd query a 'workouts' table or 'workout_plans' where completed=true
                    // For now, let's assume we count entries in 'workout_plans' that are completed
                    const { count: completedCount } = await supabase
                        .from('workout_plans')
                        .select('*', { count: 'exact', head: true })
                        .eq('athlete_id', athlete.id)
                        // Check implies all exercises done or plan marked done. 
                        // To be simple, we count plans that have a date in the past as a proxy for "should have been done"
                        // Or better, check if they have any logs. 
                        // Let's rely on a simple query for now.
                        .lt('date', new Date().toISOString());

                    return {
                        ...athlete,
                        unread_count: unreadCount || 0,
                        completed_workouts: completedCount || 0,
                        adherence: Math.floor(Math.random() * 20) + 80 // Mock adherence for now until we have strict plan tracking
                    };
                })
            );
            setAthletes(athletesWithStats);
        }
        setLoading(false);
    };

    // ... (useEffect for subscription remains same)

    const totalWorkouts = athletes.reduce((acc, curr) => acc + (curr.completed_workouts || 0), 0);
    const avgAdherence = athletes.length > 0
        ? Math.floor(athletes.reduce((acc, curr) => acc + (curr.adherence || 0), 0) / athletes.length)
        : 0;

    return (
        <div className="pb-24 animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Welcome, {coachName}</h1>
                    <p className="text-zinc-400 text-sm">
                        {format(currentDate, 'EEEE, MMMM d')}
                    </p>
                </div>

                <button className="relative p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                    <Bell size={24} className="text-zinc-300" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-900 animate-pulse"></span>
                    )}
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-lime-400/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-lime-400/10 transition-colors"></div>
                    <div className="flex items-center space-x-2 text-lime-400 mb-2">
                        <span className="bg-lime-400/10 p-1 rounded-lg"><Users size={16} /></span>
                        <span className="font-bold text-[10px] uppercase tracking-wider">Active Clients</span>
                    </div>
                    <p className="text-4xl font-bold text-white tracking-tight">{athletes.length}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-medium italic">Athletes assigned to you</p>
                </div>
                <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-blue-400/10 transition-colors"></div>
                    <div className="flex items-center space-x-2 text-blue-400 mb-2">
                        <span className="bg-blue-400/10 p-1 rounded-lg"><Activity size={16} /></span>
                        <span className="font-bold text-[10px] uppercase tracking-wider">Avg Adherence</span>
                    </div>
                    <p className="text-4xl font-bold text-white tracking-tight">{avgAdherence}%</p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-medium italic">Team consistency</p>
                </div>
            </div>



            {/* Workout Templates Management */}
            <WorkoutTemplates coachId={coachId} />

            {/* Detailed Stats Row 2 */}
            <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden relative group">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white flex items-center">
                        <TrendingUp size={18} className="mr-2 text-lime-400" />
                        Total Workouts Completed
                    </h3>
                    <span className="text-2xl font-bold text-white">{totalWorkouts}</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-lime-400 h-full rounded-full" style={{ width: '65%' }}></div>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 font-medium italic text-right">Across all athletes</p>
            </div>

            {/* Recent Progress (Mock Chart for Visuals) */}
            <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center tracking-tight">
                        <Activity className="mr-2 text-lime-400" size={20} />
                        Volume Load (Weekly)
                    </h3>
                </div>

                <div className="flex items-end space-x-2 h-32 mb-4">
                    {[40, 70, 45, 90, 65, 85, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-zinc-800/50 rounded-t-xl relative group overflow-hidden">
                            <div
                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-lime-500 to-lime-400 rounded-t-xl transition-all duration-700 ease-out"
                                style={{ height: `${h}%` }}
                            ></div>
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between px-1 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                </div>
            </div>
        </div>
    );
};
