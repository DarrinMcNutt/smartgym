import React, { useEffect, useState } from 'react';
import { supabase, getPersonalRecords } from '../services/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Calendar, CheckCircle2, Trophy, Clock } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface Props {
    athleteId: string;
}

export const AthleteProgress: React.FC<Props> = ({ athleteId }) => {
    const [stats, setStats] = useState({
        attendance: 0,
        completionRate: 0,
        lastActive: '',
        totalWorkouts: 0
    });
    const [prs, setPrs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [athleteId]);

    const fetchStats = async () => {
        // 1. Fetch Attendance (Mock logic or table count)
        // Assuming attendance table exists, or we count workouts
        const { count: attendanceCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', athleteId);

        // 2. Fetch Workouts Completion
        const { data: workouts } = await supabase
            .from('workouts')
            .select('*, workout_exercises(*)')
            .eq('athlete_id', athleteId)
            .limit(20);

        let completed = 0;
        let total = 0;
        let lastDate = null;

        if (workouts) {
            workouts.forEach((w: any) => {
                const exs = w.workout_exercises || [];
                if (exs.length > 0) {
                    const completedExs = exs.filter((e: any) => e.completed).length;
                    total += exs.length;
                    completed += completedExs;
                }
                if (!lastDate || new Date(w.date) > new Date(lastDate)) {
                    lastDate = w.date;
                }
            });
        }

        // 3. Fetch PRs
        const { data: prData } = await getPersonalRecords(athleteId);

        setStats({
            attendance: attendanceCount || 0,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            lastActive: lastDate || 'Never',
            totalWorkouts: workouts?.length || 0
        });
        setPrs(prData || []);
        setLoading(false);
    };

    if (loading) return <div className="p-4 text-zinc-500">Loading stats...</div>;

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar size={16} className="text-lime-400" />
                        <span className="text-zinc-400 text-xs font-bold uppercase">Attendance</span>
                    </div>
                    <div className="text-2xl font-black text-white">{stats.attendance} <span className="text-sm font-medium text-zinc-600">days</span></div>
                </div>
                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 size={16} className="text-blue-400" />
                        <span className="text-zinc-400 text-xs font-bold uppercase">Completion</span>
                    </div>
                    <div className="text-2xl font-black text-white">{stats.completionRate}%</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock size={16} className="text-orange-400" />
                        <span className="text-zinc-400 text-xs font-bold uppercase">Last Active</span>
                    </div>
                    <div className="text-sm font-bold text-white">{stats.lastActive !== 'Never' ? format(new Date(stats.lastActive), 'MMM d') : 'Never'}</div>
                </div>
                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy size={16} className="text-yellow-400" />
                        <span className="text-zinc-400 text-xs font-bold uppercase">Total PRs</span>
                    </div>
                    <div className="text-2xl font-black text-white">{prs.length}</div>
                </div>
            </div>

            {/* Recent PRs List */}
            <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800">
                <h4 className="font-bold text-white mb-3 text-sm uppercase tracking-wider">Recent Records</h4>
                {prs.length > 0 ? (
                    <div className="space-y-2">
                        {prs.slice(0, 3).map(pr => (
                            <div key={pr.id} className="flex justify-between items-center text-sm border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                                <span className="text-zinc-300">{pr.exercise_name}</span>
                                <span className="font-bold text-lime-400">{pr.max_weight} kg</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-zinc-500 text-xs">No records yet.</p>
                )}
            </div>

            {/* Chart Placeholder */}
            <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 h-48">
                <h4 className="font-bold text-white mb-2 text-sm uppercase tracking-wider">Activity</h4>
                <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={[
                        { name: 'Mon', val: 1 }, { name: 'Tue', val: 0 }, { name: 'Wed', val: 1 },
                        { name: 'Thu', val: 1 }, { name: 'Fri', val: 0 }, { name: 'Sat', val: 1 }, { name: 'Sun', val: 0 }
                    ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: '#333' }} contentStyle={{ backgroundColor: '#000', border: 'none' }} />
                        <Bar dataKey="val" fill="#a3e635" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
