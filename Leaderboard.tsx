import React, { useMemo } from 'react';
import { Trophy, Medal, Crown } from 'lucide-react';
import { LeaderboardEntry } from '../types';

const mockEntries: LeaderboardEntry[] = [
    { athleteId: '1', name: 'Alex Sterling', attendanceCount: 24, completedWorkoutCount: 20, streak: 12, totalScore: 0, avatarUrl: 'https://i.pravatar.cc/150?u=1' },
    { athleteId: '2', name: 'Sarah Connor', attendanceCount: 22, completedWorkoutCount: 18, streak: 8, totalScore: 0, avatarUrl: 'https://i.pravatar.cc/150?u=2' },
    { athleteId: '3', name: 'John Doe', attendanceCount: 20, completedWorkoutCount: 15, streak: 5, totalScore: 0, avatarUrl: 'https://i.pravatar.cc/150?u=3' },
    { athleteId: '4', name: 'Jane Smith', attendanceCount: 18, completedWorkoutCount: 12, streak: 3, totalScore: 0, avatarUrl: 'https://i.pravatar.cc/150?u=4' },
    { athleteId: '5', name: 'Mike Ross', attendanceCount: 15, completedWorkoutCount: 10, streak: 15, totalScore: 0, avatarUrl: 'https://i.pravatar.cc/150?u=5' },
];

// Weights
const WEIGHTS = {
    ATTENDANCE: 10,
    WORKOUT: 50,
    STREAK: 5
};

export const Leaderboard: React.FC = () => {
    const sortedRankings = useMemo(() => {
        return mockEntries.map(entry => ({
            ...entry,
            totalScore: (entry.attendanceCount * WEIGHTS.ATTENDANCE) +
                (entry.completedWorkoutCount * WEIGHTS.WORKOUT) +
                (entry.streak * WEIGHTS.STREAK)
        })).sort((a, b) => b.totalScore - a.totalScore);
    }, []);

    return (
        <div className="pb-24 animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
                <div className="text-right">
                    <div className="bg-lime-400/10 text-lime-400 px-3 py-1 rounded-full text-xs font-bold border border-lime-400/20 inline-block">
                        Global Rank #14
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">Updates Daily</p>
                </div>
            </div>

            {/* Top 3 Podium */}
            <div className="flex justify-center items-end space-x-4 mb-8">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <img src={sortedRankings[1].avatarUrl} alt={sortedRankings[1].name} className="w-16 h-16 rounded-full border-2 border-zinc-500" />
                        <div className="absolute -bottom-2 -right-1 bg-zinc-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-zinc-900">2</div>
                    </div>
                    <p className="text-xs font-bold text-white mt-2">{sortedRankings[1].name}</p>
                    <p className="text-[10px] text-lime-400 font-bold">{sortedRankings[1].totalScore} pts</p>
                    <div className="w-16 h-24 bg-zinc-800 rounded-t-lg mt-2 relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-600"></div>
                    </div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center">
                    <Crown size={24} className="text-yellow-400 mb-1 animate-bounce" />
                    <div className="relative">
                        <img src={sortedRankings[0].avatarUrl} alt={sortedRankings[0].name} className="w-20 h-20 rounded-full border-2 border-yellow-400 shadow-xl shadow-yellow-400/20" />
                        <div className="absolute -bottom-2 -right-1 bg-yellow-400 text-black w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border border-zinc-900">1</div>
                    </div>
                    <p className="text-sm font-bold text-white mt-2">{sortedRankings[0].name}</p>
                    <p className="text-xs text-yellow-400 font-bold">{sortedRankings[0].totalScore} pts</p>
                    <div className="w-20 h-32 bg-zinc-800 rounded-t-lg mt-2 relative overflow-hidden bg-gradient-to-b from-zinc-700 to-zinc-800">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-yellow-400"></div>
                    </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <img src={sortedRankings[2].avatarUrl} alt={sortedRankings[2].name} className="w-16 h-16 rounded-full border-2 border-orange-700" />
                        <div className="absolute -bottom-2 -right-1 bg-orange-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-zinc-900">3</div>
                    </div>
                    <p className="text-xs font-bold text-white mt-2">{sortedRankings[2].name}</p>
                    <p className="text-[10px] text-lime-400 font-bold">{sortedRankings[2].totalScore} pts</p>
                    <div className="w-16 h-16 bg-zinc-800 rounded-t-lg mt-2 relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-orange-700"></div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                {sortedRankings.slice(3).map((user, index) => (
                    <div key={user.athleteId} className="flex items-center justify-between bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                        <div className="flex items-center space-x-4">
                            <span className="font-bold text-zinc-500 w-4 text-center">{index + 4}</span>
                            <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
                            <div>
                                <h4 className="font-bold text-white">{user.name}</h4>
                                <div className="flex space-x-2 text-xs text-zinc-500">
                                    <span>🔥 {user.streak}</span>
                                    <span>💪 {user.completedWorkoutCount}</span>
                                </div>
                            </div>
                        </div>
                        <span className="font-bold text-lime-400">{user.totalScore}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
