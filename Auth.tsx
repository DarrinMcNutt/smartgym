import React, { useState } from 'react';
import { UserRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface AuthProps {
    onLogin: (role: UserRole, name: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.ATHLETE);
    const [gymCode, setGymCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // The App component will handle the session change and fetch profile
            } else {
                // Validate Gym Access Code
                if (role === UserRole.ATHLETE) {
                    const { data: codeData, error: codeError } = await supabase
                        .from('gym_access_codes')
                        .select('*')
                        .eq('code', gymCode)
                        .eq('is_used', false)
                        .single();

                    if (codeError || !codeData) {
                        throw new Error('Invalid or already used Gym Access Code. (كود غير صحيح أو مستخدم مسبقاً)');
                    }
                }

                // Registration
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name,
                            role: role,
                            gym_code: gymCode
                        }
                    }
                });
                if (error) throw error;

                // Mark code as used if athlete
                if (role === UserRole.ATHLETE && data.user) {
                    const { error: claimError } = await supabase
                        .rpc('claim_gym_access_code', { target_code: gymCode });

                    if (claimError) console.error("Error claiming code:", claimError);
                }

                // Setup Profile in 'profiles' table via SQL Trigger or manual insert if trigger not set
                //Ideally you should have a trigger in Supabase. For now, we will assume session handling in App.tsx might need to create profile if missing.
                setMessage('Check your email for the login link!');
            }
        } catch (err: any) {
            if (err.message === 'Failed to fetch') {
                setError('خطأ في الاتصال: يرجى التأكد من تشغيل الخادم (npm run dev) وفحص اتصال الإنترنت. (Connection error: Please restart dev server and check internet)');
            } else if (err.message?.includes('email rate limit exceeded')) {
                setError('تم تجاوز حد إرسال الإيميلات. يرجى الانتظار قليلاً أو تعطيل تأكيد الإيميل من إعدادات Supabase. (Email rate limit exceeded. Please wait or disable email confirmation in Supabase)');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="bg-zinc-900 p-8 rounded-3xl w-full max-w-md border border-zinc-800 shadow-2xl animate-fade-in relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-lime-400 to-transparent"></div>
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-lime-400 rounded-full flex items-center justify-center shadow-lg shadow-lime-400/20">
                        <span className="text-black font-bold text-2xl">GS</span>
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-white text-center mb-2">{isLogin ? 'Welcome Back' : 'Join the Team'}</h2>
                <p className="text-zinc-400 text-center mb-8">{isLogin ? 'Sign in to access your dashboard' : 'Start your fitness journey today'}</p>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-4 text-center text-sm">{error}</div>}
                {message && <div className="bg-lime-400/10 border border-lime-400/20 text-lime-400 p-3 rounded-xl mb-4 text-center text-sm">{message}</div>}

                <form onSubmit={handleAuth} className="space-y-4">
                    {!isLogin && (
                        <div className="space-y-4 animate-slide-up">
                            <div>
                                <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:border-lime-400 outline-none transition-colors"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setRole(UserRole.ATHLETE)}
                                    className={`p-3 rounded-xl border text-center transition-all ${role === UserRole.ATHLETE ? 'bg-lime-400 text-black border-lime-400 font-bold' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
                                >
                                    Athlete
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole(UserRole.COACH)}
                                    className={`p-3 rounded-xl border text-center transition-all ${role === UserRole.COACH ? 'bg-lime-400 text-black border-lime-400 font-bold' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
                                >
                                    Coach
                                </button>
                            </div>

                            {role === UserRole.ATHLETE && (
                                <div>
                                    <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Gym Access Code</label>
                                    <input
                                        type="text"
                                        value={gymCode}
                                        onChange={(e) => setGymCode(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:border-lime-400 outline-none transition-colors"
                                        placeholder="Enter code provided by your gym"
                                        required
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:border-lime-400 outline-none transition-colors"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:border-lime-400 outline-none transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-lime-400 text-black font-bold py-4 rounded-xl mt-6 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-lime-400/20"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-zinc-500 hover:text-white text-sm transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
};
