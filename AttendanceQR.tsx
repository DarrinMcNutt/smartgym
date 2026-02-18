import React from 'react';
import { QrCode, Clock } from 'lucide-react';
import { User } from '../types';

interface AttendanceQRProps {
    user: User;
}

export const AttendanceQR: React.FC<AttendanceQRProps> = ({ user }) => {
    const qrData = `GYM_USER_${user.id}_${user.gymCode}`; // Simulated QR data

    return (
        <div className="bg-white p-6 rounded-3xl flex flex-col items-center shadow-lg">
            <h3 className="text-black font-bold text-lg mb-4">Gym Access Pass</h3>

            <div className="relative mb-6 group">
                <div className="absolute inset-0 bg-lime-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                {/* Placeholder for QR Code since we can't install reliable QR lib easily, but standard img checks out */}
                <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&color=000000&bgcolor=ffffff`}
                    alt="Access QR Code"
                    className="w-48 h-48 rounded-xl border-4 border-black relative z-10"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <div className="bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold">
                        Refreshes in 59s
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-2 text-zinc-500 bg-zinc-100 px-4 py-2 rounded-full">
                <Clock size={16} />
                <span className="text-xs font-medium">Auto-checkin enabled</span>
            </div>

            <div className="mt-6 w-full pt-6 border-t border-zinc-100 flex justify-between text-black">
                <div className="text-center">
                    <span className="block text-2xl font-bold">{user.streak}</span>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Day Streak</span>
                </div>
                <div className="text-center">
                    <span className="block text-2xl font-bold">142</span>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Check-ins</span>
                </div>
            </div>
        </div>
    );
};
