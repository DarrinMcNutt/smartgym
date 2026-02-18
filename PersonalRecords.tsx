import React, { useEffect, useState } from 'react';
import { getPersonalRecords } from '../services/supabaseClient';
import { Trophy, TrendingUp, Calendar, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';

interface PR {
    id: string;
    exercise_name: string;
    max_weight: number;
    date_achieved: string;
}

export const PersonalRecords: React.FC<{ athleteId: string }> = ({ athleteId }) => {
    const [records, setRecords] = useState<PR[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (athleteId) fetchPRs();
    }, [athleteId]);

    const fetchPRs = async () => {
        const { data } = await getPersonalRecords(athleteId);
        if (data) setRecords(data as PR[]);
        setLoading(false);
    };

    if (loading) return (
        <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (records.length === 0) {
        return (
            <div className="bg-zinc-900 rounded-3xl p-8 text-center border border-zinc-800 flex flex-col items-center">
                <div className="bg-zinc-800 p-4 rounded-full mb-4">
                    <Dumbbell className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-white font-bold mb-1">No Records Yet</h3>
                <p className="text-zinc-500 text-sm">Complete workouts to set your first PR!</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {records.map((pr) => (
                <div key={pr.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between group hover:border-lime-500/30 transition-colors">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-yellow-400/10 text-yellow-400 rounded-xl shadow-lg shadow-yellow-400/5 group-hover:scale-110 transition-transform">
                            <Trophy size={20} />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-lg">{pr.exercise_name}</h4>
                            <p className="text-zinc-500 text-xs flex items-center gap-1 mt-0.5">
                                <Calendar size={10} /> {format(new Date(pr.date_achieved), 'MMM d, yyyy')}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-white">{pr.max_weight} <span className="text-sm font-medium text-zinc-500">kg</span></div>
                        <div className="text-lime-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-end gap-1 mt-1">
                            <TrendingUp size={10} /> Personal Best
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
