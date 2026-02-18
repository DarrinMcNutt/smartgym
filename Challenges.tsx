import React from 'react';
import { Target, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { Challenge } from '../types';

const mockChallenges: Challenge[] = [
    {
        id: 'c1',
        title: 'Summer Shred',
        description: 'Complete 20 workouts in 30 days',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        type: 'WORKOUT_COUNT',
        targetValue: 20
    },
    {
        id: 'c2',
        title: 'Consistency King',
        description: 'Maintain a 7-day streak',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        type: 'STREAK',
        targetValue: 7
    }
];

export const Challenges: React.FC = () => {
    return (
        <div className="pb-24 animate-fade-in space-y-6">
            <h1 className="text-2xl font-bold text-white">Active Challenges</h1>

            {mockChallenges.map(challenge => (
                <div key={challenge.id} className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/5 rounded-full blur-3xl -mr-10 -mt-10"></div>

                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-zinc-800 p-3 rounded-xl">
                            <Target size={24} className="text-lime-400" />
                        </div>
                        <div className="bg-lime-400/10 text-lime-400 px-3 py-1 rounded-full text-xs font-bold">
                            Active
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1">{challenge.title}</h3>
                    <p className="text-zinc-400 text-sm mb-4">{challenge.description}</p>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-white">Progress</span>
                            <span className="text-lime-400">12 / {challenge.targetValue}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                            <div className="bg-lime-400 h-2 rounded-full w-[60%] shadow-[0_0_10px_rgba(163,230,53,0.5)]"></div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                        <div className="flex items-center space-x-2 text-zinc-500 text-xs">
                            <Calendar size={14} />
                            <span>Ends in 12 days</span>
                        </div>
                        <button className="text-sm font-bold text-white hover:text-lime-400 transition-colors">
                            View Details
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
