import React, { useState, useEffect } from 'react';
import { Users, UserPlus, TrendingUp, ArrowRight, Shield, Search, CheckCircle, Clock, Flame, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { supabase, getAllSubscriptions, getAllAthletesWithStatus } from '../services/supabaseClient';
import { Coach, User as UserType, Subscription } from '../types';
import { format, startOfDay, endOfDay, subDays, differenceInDays, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'STATS' | 'REVENUE' | 'ATHLETES' | 'COACHES' | 'ADMINS' | 'CODES' | 'CHECKIN'>('STATS');
    const [newCoachEmail, setNewCoachEmail] = useState('');
    const [newCoachSpecialty, setNewCoachSpecialty] = useState('');
    const [adminSearch, setAdminSearch] = useState('');
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchResult, setSearchResult] = useState<any>(null);
    const [accessCodes, setAccessCodes] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Revenue & Subscriptions
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [planDistribution, setPlanDistribution] = useState<any[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);

    // Athletes List with Status
    const [allAthletes, setAllAthletes] = useState<UserType[]>([]);

    // Attendance & Stats state
    const [stats, setStats] = useState({
        totalMembers: 0,
        activeToday: 0,
        activeYesterday: 0,
        growth: '0%'
    });
    const [attendanceLog, setAttendanceLog] = useState<any[]>([]);
    const [checkInSearch, setCheckInSearch] = useState('');
    const [foundUser, setFoundUser] = useState<UserType | null>(null);
    const [isCheckingIn, setIsCheckingIn] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchCoaches();
        if (activeTab === 'CODES') fetchAccessCodes();
        if (activeTab === 'STATS' || activeTab === 'CHECKIN') fetchAttendanceLog();
        if (activeTab === 'REVENUE') fetchRevenueData();
        if (activeTab === 'ATHLETES') fetchAthletesStatus();
    }, [activeTab]);

    const fetchRevenueData = async () => {
        const { data } = await getAllSubscriptions();
        if (data) {
            setSubscriptions(data as unknown as Subscription[]);
            processRevenueData(data as unknown as Subscription[]);
        }
    };

    const processRevenueData = (subs: Subscription[]) => {
        // Calculate Total Revenue
        const total = subs.reduce((acc, sub) => acc + sub.amount, 0);
        setTotalRevenue(total);

        // Process Monthly Revenue (Mock for demo if data is sparse, or real calculation)
        // Group by month
        const monthlyData: Record<string, number> = {};
        subs.forEach(sub => {
            const month = format(parseISO(sub.created_at), 'MMM');
            monthlyData[month] = (monthlyData[month] || 0) + sub.amount;
        });

        // Ensure we have at least some data points for chart
        const chartData = Object.keys(monthlyData).map(key => ({
            name: key,
            revenue: monthlyData[key]
        }));
        setRevenueData(chartData.length > 0 ? chartData : [{ name: 'Feb', revenue: 0 }]);

        // Process Plan Distribution
        const distribution: Record<string, number> = {};
        subs.forEach(sub => {
            distribution[sub.plan_type] = (distribution[sub.plan_type] || 0) + 1;
        });

        const pieData = Object.keys(distribution).map(key => ({
            name: key.charAt(0).toUpperCase() + key.slice(1),
            value: distribution[key]
        }));
        setPlanDistribution(pieData.length > 0 ? pieData : [{ name: 'None', value: 1 }]);
    };

    const fetchAthletesStatus = async () => {
        const { data } = await getAllAthletesWithStatus();
        if (data) {
            setAllAthletes(data as UserType[]);
        }
    };

    const getStatusColor = (endDate?: string) => {
        if (!endDate) return 'bg-red-500/10 text-red-500 border-red-500/20';

        const daysLeft = differenceInDays(parseISO(endDate), new Date());

        if (daysLeft < 0) return 'bg-red-500/10 text-red-500 border-red-500/20'; // Expired
        if (daysLeft < 7) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'; // Expiring Soon
        return 'bg-lime-400/10 text-lime-400 border-lime-400/20'; // Active
    };

    const getStatusLabel = (endDate?: string) => {
        if (!endDate) return 'No Sub';
        const daysLeft = differenceInDays(parseISO(endDate), new Date());
        if (daysLeft < 0) return 'Expired';
        if (daysLeft < 7) return `${daysLeft} days left`;
        return 'Active';
    };

    const fetchStats = async () => {
        // Fetch total active members
        const { count: totalCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'ATHLETE');

        // Fetch today's attendance
        const today = startOfDay(new Date()).toISOString();
        const tomorrow = endOfDay(new Date()).toISOString();
        const { count: todayCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .gte('check_in_time', today)
            .lte('check_in_time', tomorrow);

        // Fetch yesterday's attendance
        const yesterdayStart = startOfDay(subDays(new Date(), 1)).toISOString();
        const yesterdayEnd = endOfDay(subDays(new Date(), 1)).toISOString();
        const { count: yesterdayCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .gte('check_in_time', yesterdayStart)
            .lte('check_in_time', yesterdayEnd);

        setStats({
            totalMembers: totalCount || 0,
            activeToday: todayCount || 0,
            activeYesterday: yesterdayCount || 0,
            growth: yesterdayCount ? `${Math.round(((todayCount || 0) - yesterdayCount) / yesterdayCount * 100)}%` : '+100%'
        });
    };

    const fetchAttendanceLog = async () => {
        const { data } = await supabase
            .from('attendance')
            .select(`
                *,
                profiles (name, avatar_url, gym_code)
            `)
            .order('check_in_time', { ascending: false })
            .limit(10);

        if (data) setAttendanceLog(data);
    };

    const fetchAccessCodes = async () => {
        const { data, error } = await supabase
            .from('gym_access_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setAccessCodes(data);
    };

    const generateAccessCode = async () => {
        setIsGenerating(true);
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'GS-';
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const { error } = await supabase
            .from('gym_access_codes')
            .insert([{ code }]);

        if (!error) {
            fetchAccessCodes();
        }
        setIsGenerating(false);
    };

    const fetchCoaches = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'COACH');

        if (data) {
            setCoaches(data.map(d => ({
                id: d.id,
                name: d.name,
                bio: d.bio || 'Professional Coach',
                specialty: d.gym_code || 'General Fitness',
                avatarUrl: d.avatar_url
            })));
        }
    };

    const handleSearchCheckIn = async () => {
        if (!checkInSearch) return;
        setLoading(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .or(`email.ilike.%${checkInSearch}%,name.ilike.%${checkInSearch}%,id.eq.${checkInSearch}`)
            .limit(1)
            .single();

        setFoundUser(data);
        setLoading(false);
    };

    const handleRecordAttendance = async () => {
        if (!foundUser) return;
        setIsCheckingIn(true);
        const { error } = await supabase.rpc('record_attendance', { target_user_id: foundUser.id });

        if (!error) {
            alert('Attendance recorded successfully!');
            setFoundUser(null);
            setCheckInSearch('');
            fetchStats();
            fetchAttendanceLog();
        } else {
            // Fallback if RPC is not there yet
            const { error: insError } = await supabase
                .from('attendance')
                .insert([{ user_id: foundUser.id }]);

            if (!insError) {
                await supabase.from('profiles').update({ last_check_in: new Date().toISOString() }).eq('id', foundUser.id);
                alert('Attendance recorded successfully!');
                setFoundUser(null);
                setCheckInSearch('');
                fetchStats();
                fetchAttendanceLog();
            } else {
                alert(`Error: ${insError.message}`);
            }
        }
        setIsCheckingIn(false);
    };

    const handleSearchUser = async () => {
        if (!newCoachEmail) return;
        setLoading(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .ilike('email', `%${newCoachEmail}%`)
            .limit(1)
            .single();

        setSearchResult(data);
        setLoading(false);
    };

    const handlePromoteToCoach = async () => {
        if (!searchResult) return;
        const { error } = await supabase
            .from('profiles')
            .update({
                role: 'COACH',
                bio: newCoachSpecialty
            })
            .eq('id', searchResult.id);

        if (!error) {
            alert(`Coach added successfully!`);
            setSearchResult(null);
            setCoaches([]); // Trigger refetch
            fetchCoaches();
        }
    };

    const COLORS = ['#a3e635', '#3b82f6', '#f59e0b', '#ec4899'];

    return (
        <div className="pb-24 animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Admin Panel</h1>
                    <p className="text-zinc-400 text-sm">Managing GymSmart Infrastructure</p>
                </div>
                <div className="bg-lime-400/10 p-2 rounded-2xl">
                    <Shield className="text-lime-400" size={24} />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800 overflow-x-auto no-scrollbar">
                {[
                    { id: 'STATS', label: 'Overview' },
                    { id: 'REVENUE', label: 'Revenue' },
                    { id: 'ATHLETES', label: 'Athletes' },
                    { id: 'CHECKIN', label: 'Check-in' },
                    { id: 'COACHES', label: 'Coaches' },
                    { id: 'CODES', label: 'Codes' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 min-w-[80px] py-3 rounded-xl font-bold text-xs transition-all ${activeTab === tab.id ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'STATS' ? (
                <div className="space-y-6 animate-slide-up">
                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-lime-400/5 rounded-full blur-xl group-hover:bg-lime-400/10 transition-colors"></div>
                            <div className="flex items-center space-x-3 mb-3 text-zinc-500">
                                <Users size={18} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Total Members</span>
                            </div>
                            <div className="flex items-end space-x-2">
                                <span className="text-3xl font-bold text-white">{stats.totalMembers}</span>
                                <span className="text-lime-400 text-xs font-bold pb-1">{stats.growth}</span>
                            </div>
                        </div>
                        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-400/5 rounded-full blur-xl group-hover:bg-blue-400/10 transition-colors"></div>
                            <div className="flex items-center space-x-3 mb-3 text-zinc-500">
                                <TrendingUp size={18} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Activity Today</span>
                            </div>
                            <div className="flex items-end space-x-2">
                                <span className="text-3xl font-bold text-white">{stats.activeToday}</span>
                                <span className="text-zinc-500 text-[10px] font-bold pb-1">/ {stats.activeYesterday} last</span>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Chart Mockup */}
                    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold flex items-center">
                                <Clock className="mr-2 text-lime-400" size={18} />
                                Peak Hours
                            </h3>
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last 24h</div>
                        </div>
                        <div className="h-32 flex items-end space-x-1 px-2">
                            {[20, 35, 60, 85, 40, 30, 75, 95, 55, 30, 15, 10].map((h, i) => (
                                <div key={i} className="flex-1 bg-zinc-800/50 rounded-t-lg relative group">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-lime-400/40 group-hover:bg-lime-400 transition-all rounded-t-lg"
                                        style={{ height: `${h}%` }}
                                    ></div>
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {i + 8}:00
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 px-1 text-[8px] text-zinc-600 font-bold uppercase">
                            <span>8 AM</span>
                            <span>12 PM</span>
                            <span>4 PM</span>
                            <span>8 PM</span>
                        </div>
                    </div>

                    {/* Recent Attendance Log */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-bold">Recent Check-ins</h3>
                            <button onClick={() => setActiveTab('CHECKIN')} className="text-lime-400 text-xs font-bold px-3 py-1 bg-lime-400/5 rounded-full border border-lime-400/10">Manual Check-in</button>
                        </div>
                        <div className="space-y-2">
                            {attendanceLog.length === 0 ? (
                                <p className="text-zinc-500 text-xs text-center py-8">No recent activity found.</p>
                            ) : (
                                attendanceLog.map((log, i) => (
                                    <div key={log.id} className="bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/50 flex items-center space-x-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                                        <img src={log.profiles?.avatar_url} className="w-10 h-10 rounded-full border border-zinc-800" />
                                        <div className="flex-1">
                                            <p className="text-white text-sm font-bold">{log.profiles?.name}</p>
                                            <p className="text-zinc-500 text-[10px]">{log.profiles?.gym_code || 'MEMBER'} • {format(new Date(log.check_in_time), 'hh:mm a')}</p>
                                        </div>
                                        <div className="bg-lime-400/10 p-1.5 rounded-full">
                                            <CheckCircle size={14} className="text-lime-400" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'REVENUE' ? (
                <div className="space-y-6 animate-slide-up">
                    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 rounded-3xl border border-zinc-800 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/5 blur-3xl rounded-full"></div>
                        <div className="flex items-center space-x-3 mb-4 text-zinc-500">
                            <DollarSign size={20} className="text-lime-400" />
                            <span className="text-xs font-bold uppercase tracking-widest">Total Revenue</span>
                        </div>
                        <div className="flex items-end space-x-2">
                            <span className="text-4xl font-black text-white">${totalRevenue.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Revenue Chart */}
                    <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800">
                        <h3 className="font-bold text-white mb-4 ml-2">Revenue Trend</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                                        labelStyle={{ color: '#a1a1aa' }}
                                    />
                                    <Bar dataKey="revenue" fill="#a3e635" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>


                </div>
            ) : activeTab === 'ATHLETES' ? (
                <div className="space-y-6 animate-slide-up">
                    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                        <h3 className="text-white font-bold mb-4 flex items-center">
                            <Users size={18} className="mr-2 text-lime-400" />
                            All Athletes
                        </h3>
                        <div className="space-y-3">
                            {allAthletes.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500 text-sm">Loading athletes...</div>
                            ) : (
                                allAthletes.map(athlete => (
                                    <div key={athlete.id} className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={athlete.avatarUrl} className="w-10 h-10 rounded-full bg-zinc-800 object-cover" />
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{athlete.name}</h4>
                                                <p className="text-[10px] text-zinc-500">{athlete.email}</p>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(athlete.membershipEnd)}`}>
                                            {getStatusLabel(athlete.membershipEnd)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'CHECKIN' ? (
                <div className="space-y-6 animate-slide-up">
                    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-lime-400/5 blur-3xl rounded-full"></div>

                        <h3 className="text-white font-bold mb-4 flex items-center text-lg">
                            <Search size={20} className="mr-2 text-lime-400" />
                            Receptionist Check-in
                        </h3>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Search by name, email or ID..."
                                value={checkInSearch}
                                onChange={e => setCheckInSearch(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSearchCheckIn()}
                                className="flex-1 bg-black p-4 rounded-2xl text-white text-sm outline-none border border-zinc-800 focus:border-lime-400 transition-colors"
                            />
                            <button
                                onClick={handleSearchCheckIn}
                                disabled={loading}
                                className="bg-zinc-800 p-4 rounded-2xl text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                            >
                                <Search size={20} />
                            </button>
                        </div>

                        {foundUser && (
                            <div className="mt-6 bg-black/50 p-6 rounded-2xl border border-lime-400/20 animate-fade-in">
                                <div className="flex items-center space-x-4 mb-6">
                                    <img src={foundUser.avatarUrl} className="w-16 h-16 rounded-full ring-4 ring-lime-400/10" />
                                    <div className="flex-1">
                                        <p className="text-white text-lg font-bold">{foundUser.name}</p>
                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{foundUser.gymCode || 'Member'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                                        <p className="text-zinc-500 text-[10px] font-bold uppercase mb-1">Last Check-in</p>
                                        <p className="text-white text-sm font-bold">
                                            {foundUser.lastCheckIn ? format(new Date(foundUser.lastCheckIn), 'MMM d, hh:mm a') : 'Never'}
                                        </p>
                                    </div>
                                    <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                                        <p className="text-zinc-500 text-[10px] font-bold uppercase mb-1">Streak</p>
                                        <p className="text-white text-sm font-bold flex items-center">
                                            <Flame size={14} className="mr-1 text-orange-500" />
                                            {foundUser.streak} Days
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRecordAttendance}
                                    disabled={isCheckingIn}
                                    className="w-full bg-lime-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-lime-400/20 disabled:opacity-50"
                                >
                                    {isCheckingIn ? 'Processing...' : 'Record Check-in'}
                                </button>
                            </div>
                        )}

                        {!foundUser && !loading && checkInSearch && (
                            <div className="mt-6 text-center py-8 bg-black/20 rounded-2xl border border-dashed border-zinc-800">
                                <p className="text-zinc-500 text-sm">No user found matching "{checkInSearch}"</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'COACHES' ? (
                <div className="space-y-6 animate-slide-up">
                    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                        <h3 className="text-white font-bold mb-4 flex items-center">
                            <UserPlus size={18} className="mr-2 text-lime-400" />
                            Add New Coach
                        </h3>
                        <form onSubmit={(e) => { e.preventDefault(); handleSearchUser(); }} className="space-y-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Enter user email to promote..."
                                    value={newCoachEmail}
                                    onChange={e => setNewCoachEmail(e.target.value)}
                                    className="w-full bg-black p-3 rounded-xl text-white text-sm outline-none border border-zinc-800 focus:border-lime-400 transition-colors pr-10"
                                />
                                <button type="button" onClick={handleSearchUser} className="absolute right-3 top-3 text-zinc-500 hover:text-white">
                                    <Search size={18} />
                                </button>
                            </div>

                            {searchResult && (
                                <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <img src={searchResult.avatar_url} className="w-10 h-10 rounded-full" />
                                            <div>
                                                <p className="text-white text-sm font-bold">{searchResult.name}</p>
                                                <p className="text-zinc-500 text-[10px]">{searchResult.id}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handlePromoteToCoach}
                                            className="bg-lime-400 text-black text-xs font-bold px-4 py-2 rounded-lg hover:brightness-110 transition-all"
                                        >
                                            Add Coach
                                        </button>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-zinc-500 text-[10px] uppercase font-bold mb-1">Coach Bio (Short description)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Expert in strength & conditioning"
                                            value={newCoachSpecialty}
                                            onChange={e => setNewCoachSpecialty(e.target.value)}
                                            className="w-full bg-zinc-900 p-3 rounded-xl text-white text-sm outline-none border border-zinc-800 focus:border-lime-400 transition-colors"
                                        />
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-white font-bold ml-1">Current Coaches</h3>
                        <div className="space-y-3">
                            {coaches.length === 0 ? (
                                <p className="text-zinc-500 text-sm text-center py-8 bg-zinc-900/40 rounded-3xl">No coaches added yet.</p>
                            ) : (
                                coaches.map(coach => (
                                    <div key={coach.id} className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 flex items-center space-x-4">
                                        <img src={coach.avatarUrl} alt={coach.name} className="w-12 h-12 rounded-full ring-2 ring-zinc-800" />
                                        <div className="flex-1">
                                            <h4 className="font-bold text-white">{coach.name}</h4>
                                            <p className="text-xs text-zinc-400 line-clamp-1">{coach.bio}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'CODES' ? (
                <div className="space-y-6 animate-slide-up">
                    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/5 blur-3xl rounded-full -mr-16 -mt-16"></div>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Shield size={20} className="mr-2 text-lime-400" />
                                    One-Time Access Codes
                                </h3>
                                <p className="text-zinc-500 text-xs mt-1">Generate unique codes for new gym members</p>
                            </div>
                            <button
                                onClick={generateAccessCode}
                                disabled={isGenerating}
                                className="bg-lime-400 text-black px-6 py-2.5 rounded-xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-lime-400/10"
                            >
                                {isGenerating ? 'Generating...' : 'New Code'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {accessCodes.map((item) => (
                                <div
                                    key={item.code}
                                    className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${item.is_used ? 'bg-zinc-900/30 border-zinc-800/50 grayscale opacity-60' : 'bg-black/40 border-zinc-800 hover:border-lime-400/30'}`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <p className={`font-mono font-bold text-lg tracking-wider truncate ${item.is_used ? 'text-zinc-500' : 'text-lime-400'}`}>
                                                {item.code}
                                            </p>
                                            {item.is_used && <span className="text-[9px] text-red-500 font-bold uppercase">Used</span>}
                                        </div>
                                        <p className="text-zinc-500 text-[10px]">Created: {format(new Date(item.created_at), 'MMM d, yyyy')}</p>
                                    </div>
                                    {!item.is_used && (
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(item.code); alert('Copied!'); }}
                                            className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-lime-400 hover:text-black transition-all"
                                        >
                                            <ArrowRight size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-slide-up">
                    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                        <h3 className="text-white font-bold mb-4 flex items-center">
                            <Shield size={18} className="mr-2 text-lime-400" />
                            Admin Management
                        </h3>
                        <div className="text-zinc-500 text-xs italic">Only super admins can manage other administrators.</div>
                    </div>
                </div>
            )}
        </div>
    );
};
