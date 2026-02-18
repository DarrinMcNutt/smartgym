import React from 'react';
import { CreditCard, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';

interface MembershipCardProps {
    startDate?: string;
    endDate?: string;
}

export const MembershipCard: React.FC<MembershipCardProps> = ({ startDate, endDate }) => {
    if (!startDate || !endDate) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                <div className="flex items-center space-x-3 mb-4 text-zinc-500">
                    <CreditCard size={20} />
                    <h3 className="font-bold text-lg">Membership Status</h3>
                </div>
                <div className="bg-zinc-800/50 p-4 rounded-2xl border border-dashed border-zinc-700 text-center">
                    <p className="text-zinc-400 text-sm italic">No active membership found.</p>
                    <button className="mt-3 bg-lime-400 text-black text-xs font-bold px-4 py-2 rounded-xl hover:brightness-110 transition-all">
                        Renew Now
                    </button>
                </div>
            </div>
        );
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const today = new Date();
    const daysRemaining = differenceInDays(end, today);

    // Logic: 
    // Green: Active (> 7 days)
    // Yellow: Expiring Soon (<= 7 days & >= 0)
    // Red: Expired (< 0)

    const isExpired = daysRemaining < 0;
    const isExpiringSoon = daysRemaining <= 7 && !isExpired;
    const isActive = !isExpired && !isExpiringSoon;

    const statusColor = isExpired ? 'red' : isExpiringSoon ? 'yellow' : 'lime';
    const statusText = isExpired ? 'EXPIRED' : isExpiringSoon ? 'EXPIRING SOON' : 'ACTIVE';

    return (
        <div className={`bg-zinc-900 border ${isExpiringSoon ? 'border-yellow-500/50 shadow-yellow-500/10' :
                isExpired ? 'border-red-500/50 grayscale' :
                    'border-lime-500/50'
            } p-6 rounded-3xl shadow-xl relative overflow-hidden group transition-all`}>

            {/* Background Accent */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 transition-colors ${isExpiringSoon ? 'bg-yellow-500' :
                    isExpired ? 'bg-red-500' :
                        'bg-lime-400'
                }`}></div>

            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${isExpiringSoon ? 'bg-yellow-500/10 text-yellow-500' :
                            isExpired ? 'bg-red-500/10 text-red-500' :
                                'bg-lime-400/10 text-lime-400'
                        }`}>
                        <CreditCard size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight">Gym Member</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isExpiringSoon ? 'text-yellow-500' :
                                isExpired ? 'text-red-500' :
                                    'text-lime-400'
                            }`}>Premium Plan</p>
                    </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${isExpiringSoon ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse' :
                        isExpired ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            'bg-lime-400/10 text-lime-400 border-lime-400/20'
                    }`}>
                    {statusText}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-tight">Started</p>
                    <p className={`text-sm font-medium flex items-center ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                        <Calendar size={12} className="mr-1.5 text-zinc-500" />
                        {format(start, 'MMM d, yyyy')}
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-tight">Ends</p>
                    <p className={`text-sm font-medium flex items-center ${isExpiringSoon ? 'text-yellow-500' : isExpired ? 'text-red-500' : 'text-lime-400'}`}>
                        <Calendar size={12} className="mr-1.5 text-zinc-500" />
                        {format(end, 'MMM d, yyyy')}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <p className="text-zinc-400 text-xs font-medium">Time Remaining</p>
                    <p className={`text-2xl font-black ${isExpiringSoon ? 'text-yellow-500' :
                            isExpired ? 'text-red-500' :
                                'text-white'
                        }`}>
                        {Math.max(0, daysRemaining)} <span className="text-xs font-bold text-zinc-500 uppercase">Days</span>
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ease-out ${isExpiringSoon ? 'bg-yellow-500' :
                                isExpired ? 'bg-red-500' :
                                    'bg-lime-400'
                            }`}
                        style={{ width: `${Math.max(0, Math.min(100, (daysRemaining / 30) * 100))}%` }}
                    ></div>
                </div>

                {isExpiringSoon && (
                    <div className="mt-4 flex items-center space-x-2 text-yellow-500 bg-yellow-500/5 p-3 rounded-2xl border border-yellow-500/10">
                        <AlertCircle size={16} />
                        <p className="text-[10px] font-bold leading-tight">Expiring soon! Please renew.</p>
                    </div>
                )}

                {isActive && (
                    <div className="mt-4 flex items-center space-x-2 text-lime-400 bg-lime-400/5 p-3 rounded-2xl border border-lime-400/10">
                        <CheckCircle2 size={16} />
                        <p className="text-[10px] font-bold leading-tight">Active membership. Keep training!</p>
                    </div>
                )}
            </div>
        </div>
    );
};
