import { AttendanceQR } from './AttendanceQR';
import { PersonalRecords } from './PersonalRecords';
import { supabase } from '../services/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Settings, LogOut, ChevronRight, Trophy, Flame, Activity, Scale, Dumbbell, Camera, Loader2, Upload } from 'lucide-react';

interface ProfileProps {
    user: User | null;
}

// Mock Data for Progress
const weightData = [
    { date: 'Jan', weight: 82 },
    { date: 'Feb', weight: 81 },
    { date: 'Mar', weight: 80.5 },
    { date: 'Apr', weight: 79 },
    { date: 'May', weight: 78.5 },
    { date: 'Jun', weight: 78 },
];

export const Profile: React.FC<ProfileProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'progress'>('overview');

    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!user) return null;

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUpdatingAvatar(true);

            // 1. Compress Image using canvas
            const compressedBlob = await compressImage(file);

            // 2. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('gym_uploads')
                .upload(filePath, compressedBlob);

            if (uploadError) {
                if (uploadError.message.includes('bucket not found')) {
                    throw new Error("Storage bucket 'gym_uploads' not found. Please run the setup SQL script provided.");
                }
                throw uploadError;
            }

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('gym_uploads')
                .getPublicUrl(filePath);

            // 4. Update Database
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 5. Refresh App (simple reload or notify parent if we had a callback)
            alert("Profile picture updated successfully!");
            window.location.reload(); // Quick way to refresh across app

        } catch (err: any) {
            console.error("Error updating avatar:", err);
            alert(`Failed: ${err.message}`);
        } finally {
            setIsUpdatingAvatar(false);
        }
    };

    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 400;
                    const MAX_HEIGHT = 400;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                    }, 'image/jpeg', 0.7);
                };
            };
        });
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error.message);
        }
    };

    return (
        <div className="pb-24 animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                    <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                        <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className={`w-20 h-20 rounded-full border-2 border-lime-400 object-cover transition-opacity ${isUpdatingAvatar ? 'opacity-50' : 'group-hover:opacity-80'}`}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera size={24} className="text-white" />
                        </div>
                        {isUpdatingAvatar && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 size={24} className="text-lime-400 animate-spin" />
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                        <div className="flex items-center space-x-2 text-lime-400">
                            <Flame size={16} fill="currentColor" />
                            <span className="font-bold text-sm">{user.streak} Day Streak</span>
                        </div>
                    </div>
                </div>
                <button className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                    <Settings size={20} className="text-zinc-400" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-zinc-900 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('progress')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'progress' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                >
                    Progress
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6 animate-slide-up">
                    <AttendanceQR user={user} />

                    <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white flex items-center">
                                <Trophy className="mr-2 text-yellow-500" size={20} />
                                Achievements
                            </h3>
                            <span className="text-lime-400 font-bold">{user.points} pts</span>
                        </div>
                        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="min-w-[80px] h-24 bg-zinc-800 rounded-xl flex flex-col items-center justify-center p-2 border border-zinc-700">
                                    <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center mb-2 text-xl">
                                        🥇
                                    </div>
                                    <span className="text-[10px] text-zinc-400 text-center leading-tight">Early Bird</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'progress' && (
                <div className="space-y-6 animate-slide-up">
                    {/* Current Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col items-center">
                            <Scale size={20} className="text-zinc-500 mb-2" />
                            <span className="text-xl font-bold text-white">78.0</span>
                            <span className="text-[10px] text-zinc-500 uppercase">kg Weight</span>
                        </div>
                        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col items-center">
                            <Activity size={20} className="text-lime-400 mb-2" />
                            <span className="text-xl font-bold text-white">15.2%</span>
                            <span className="text-[10px] text-zinc-500 uppercase">Body Fat</span>
                        </div>
                        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col items-center">
                            <Dumbbell size={20} className="text-blue-400 mb-2" />
                            <span className="text-xl font-bold text-white">42.5%</span>
                            <span className="text-[10px] text-zinc-500 uppercase">Muscle</span>
                        </div>
                    </div>

                    {/* Weight Chart */}
                    <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800">
                        <h3 className="font-bold text-white mb-4 ml-2">Weight Trend</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weightData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                                        labelStyle={{ color: '#a1a1aa' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="weight"
                                        stroke="#a3e635"
                                        strokeWidth={3}
                                        dot={{ fill: '#a3e635', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#fff' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <PersonalRecords athleteId={user.id} />
                </div>
            )}

            <button
                onClick={handleLogout}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-colors"
            >
                <LogOut size={20} />
                <span>Log Out</span>
            </button>
        </div>
    );
};
