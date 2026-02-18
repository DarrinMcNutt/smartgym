import React, { useState, useEffect } from 'react';
import { Users, Search, MessageSquare, TrendingUp, Dumbbell, Activity } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AthletesViewProps {
    coachId: string;
    onChatAthlete: (athleteId: string) => void;
    onAssignWorkout: (athleteId: string) => void;
    onViewWorkoutHistory?: () => void;
}

export const AthletesView: React.FC<AthletesViewProps> = ({ coachId, onChatAthlete, onAssignWorkout, onViewWorkoutHistory }) => {
    const [athletes, setAthletes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchAthletes();

        const channel = supabase
            .channel(`athletes_updates:${coachId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${coachId}` },
                () => fetchAthletes()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [coachId]);

    const fetchAthletes = async () => {
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .eq('selected_coach_id', coachId);

        if (profiles) {
            const withUnread = await Promise.all(
                profiles.map(async (athlete) => {
                    const { count } = await supabase
                        .from('messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('sender_id', athlete.id)
                        .eq('receiver_id', coachId)
                        .eq('is_read', false);

                    return {
                        ...athlete,
                        unread_count: count || 0,
                        streak: athlete.streak || 0 // Ensure streak is at least 0
                    };
                })
            );
            // Sort by unread count first, then by name
            const sorted = withUnread.sort((a, b) => {
                if (b.unread_count !== a.unread_count) return b.unread_count - a.unread_count;
                return a.name.localeCompare(b.name);
            });
            setAthletes(sorted);
        }
        setLoading(false);
    };

    const filteredAthletes = athletes.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="pb-24 animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white flex items-center">
                    <Users className="mr-3 text-lime-400" />
                    My Athletes
                </h1>
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg font-bold">
                    {athletes.length} Total
                </span>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-lime-400 transition-colors"
                />
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20 text-zinc-500 animate-pulse font-bold">Loading your roster...</div>
                ) : filteredAthletes.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/40 rounded-3xl border border-dashed border-zinc-800">
                        <Users size={48} className="mx-auto text-zinc-800 mb-4" />
                        <p className="text-zinc-500 font-medium">No athletes found.</p>
                    </div>
                ) : (
                    filteredAthletes.map((athlete) => (
                        <div
                            key={athlete.id}
                            className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 flex items-center justify-between hover:border-lime-400/50 transition-colors group"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <img src={athlete.avatar_url || `https://i.pravatar.cc/150?u=${athlete.id}`} className="w-14 h-14 rounded-2xl object-cover" alt={athlete.name} />
                                    {athlete.unread_count > 0 && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-900 animate-pulse"></span>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold group-hover:text-lime-400 transition-colors">{athlete.name}</h4>
                                    <div className="flex items-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
                                        <TrendingUp size={12} className="mr-1 text-lime-400" />
                                        {athlete.streak} Day Streak
                                    </div>
                                    <div className="flex items-center text-[10px] text-zinc-500 mt-1">
                                        <Activity size={12} className="mr-1 text-blue-400" />
                                        Mock: {Math.floor(Math.random() * 10)} Sessions
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => onAssignWorkout(athlete.id)}
                                    className="bg-zinc-800 p-3 rounded-2xl text-lime-400 hover:bg-zinc-700 transition-colors shadow-lg"
                                    title="Create Workout"
                                >
                                    <Dumbbell size={20} />
                                </button>
                                <button
                                    onClick={() => onViewWorkoutHistory && onViewWorkoutHistory()}
                                    className="bg-zinc-800 p-3 rounded-2xl text-lime-400 hover:bg-zinc-700 transition-colors shadow-lg"
                                    title="See Plans"
                                >
                                    <Activity size={20} />
                                </button>
                                <button
                                    onClick={() => onChatAthlete(athlete.id)}
                                    className="bg-lime-400 p-3 rounded-2xl text-black hover:scale-105 transition-transform shadow-lg shadow-lime-400/20"
                                    title="Chat"
                                >
                                    <MessageSquare size={20} fill="black" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Removed */}
        </div>
    );
};
