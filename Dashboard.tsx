import { format } from 'date-fns';
import { Bell, Flame, User, CheckCircle, ChevronRight, Users, Clock } from 'lucide-react';
import { User as UserType, Coach, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import React, { useState, useEffect } from 'react';
import { MembershipCard } from './MembershipCard';
import { AthleteProgress } from './AthleteProgress';

interface DashboardProps {
  user: UserType;
  onSelectCoach: (coachId: string) => void;
  onChatWithCoach: () => void;
  unreadCount?: number;
  onViewAssignedWorkouts?: () => void;
  onOpenTimer?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onSelectCoach, onChatWithCoach, unreadCount: propUnreadCount, onViewAssignedWorkouts, onOpenTimer }) => {
  const currentDate = new Date();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<Coach | undefined>(undefined);
  const unreadCount = propUnreadCount || 0;

  // Coach State
  const [myAthletes, setMyAthletes] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);


  useEffect(() => {
    if (user.role === 'COACH') {
      fetchMyAthletes();
    } else {
      fetchCoaches();
    }
  }, [user.role]);

  useEffect(() => {
    if (user.selectedCoachId && coaches.length > 0) {
      const coach = coaches.find(c => c.id === user.selectedCoachId);
      setSelectedCoach(coach);
    } else {
      setSelectedCoach(undefined);
    }
  }, [user.selectedCoachId, coaches]);



  const fetchCoaches = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'COACH');

    if (data) {
      const mappedCoaches = data.map(d => ({
        id: d.id,
        name: d.name,
        bio: d.bio || 'Professional GymSmart Coach ready to help you reach your goals.',
        specialty: d.gym_code || 'Elite Fitness',
        avatarUrl: d.avatar_url
      }));
      setCoaches(mappedCoaches);
    }
  };

  const fetchMyAthletes = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('selected_coach_id', user.id);
    if (data) setMyAthletes(data);
  };

  return (
    <div className="pb-24 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Hello, {user.name}</h1>
          <p className="text-zinc-400 text-sm">{format(currentDate, 'EEEE, MMMM d')}</p>
        </div>


        <img src={user.avatarUrl} alt="Profile" className="w-10 h-10 rounded-full border border-zinc-700" />
      </div>

      {/* Coach Content */}
      {user.role === 'COACH' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="text-lime-400" /> My Athletes
            </h2>
            {selectedAthleteId && (
              <button onClick={() => setSelectedAthleteId(null)} className="text-sm text-zinc-400 hover:text-white">Back to List</button>
            )}
          </div>

          {!selectedAthleteId ? (
            <div className="grid grid-cols-1 gap-3">
              {myAthletes.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">No athletes assigned yet.</p>
              ) : (
                myAthletes.map(athlete => (
                  <div key={athlete.id} onClick={() => setSelectedAthleteId(athlete.id)} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between hover:border-lime-500/50 cursor-pointer transition-all">
                    <div className="flex items-center gap-3">
                      <img src={athlete.avatar_url || 'https://via.placeholder.com/40'} alt={athlete.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <h4 className="font-bold text-white">{athlete.name}</h4>
                        <p className="text-xs text-zinc-500">Streak: {athlete.streak} Days</p>
                      </div>
                    </div>
                    <ChevronRight className="text-zinc-600" />
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="animate-slide-up">
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 mb-4 flex items-center gap-3">
                <img src={myAthletes.find(a => a.id === selectedAthleteId)?.avatar_url} className="w-12 h-12 rounded-full" />
                <div>
                  <h3 className="text-lg font-bold text-white">{myAthletes.find(a => a.id === selectedAthleteId)?.name}</h3>
                  <p className="text-zinc-400 text-xs">Viewing Progress</p>
                </div>
              </div>
              <AthleteProgress athleteId={selectedAthleteId} />
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Membership Card */}
          <MembershipCard
            startDate={user.membershipStart || '2026-02-01T00:00:00Z'}
            endDate={user.membershipEnd || '2026-02-28T23:59:59Z'}
          />

          {/* Streak Banner */}
          <div className="bg-gradient-to-r from-lime-400 to-lime-500 rounded-3xl p-5 text-black shadow-lg shadow-lime-400/20">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Flame size={24} fill="black" />
                  <span className="font-bold text-lg">Daily Streak</span>
                </div>
                <p className="font-medium opacity-80">You're on fire! Keep it up.</p>
              </div>


              <div className="text-4xl font-bold">{user.streak}</div>
            </div>
          </div>

          {/* Coach Selection Section */}
          {!selectedCoach ? (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <Users size={20} className="mr-2 text-lime-400" />
                Select Your Coach
              </h3>


              <div className="space-y-3">
                {coaches.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-8 bg-zinc-900/40 rounded-3xl">No coaches available yet. Check back soon!</p>
                ) : (
                  coaches.map(coach => (
                    <div key={coach.id} className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 flex items-start space-x-4">
                      <img src={coach.avatarUrl} alt={coach.name} className="w-16 h-16 rounded-2xl object-cover" />
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-lg">{coach.name}</h4>
                        <p className="text-xs text-lime-400 font-bold mb-1">{coach.specialty}</p>
                        <p className="text-xs text-zinc-400 leading-relaxed mb-3">{coach.bio}</p>
                        <button
                          onClick={() => onSelectCoach(coach.id)}
                          className="bg-white text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors"
                        >
                          Select Coach
                        </button>


                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Your Coach</h3>
                <span className="bg-lime-400/10 text-lime-400 text-xs px-2 py-1 rounded-full font-bold">Active</span>
              </div>


              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img src={selectedCoach.avatarUrl} alt={selectedCoach.name} className="w-12 h-12 rounded-full" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-900 animate-pulse"></span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white">{selectedCoach.name}</h4>
                  <p className="text-xs text-zinc-400">{selectedCoach.bio}</p>
                  <button
                    onClick={onChatWithCoach}
                    className="mt-2 text-xs font-bold text-lime-400 hover:text-white transition-colors flex items-center"
                  >
                    Chat Now &rarr;
                  </button>


                </div>
                <button className="bg-zinc-800 p-2 rounded-full text-white hover:bg-zinc-700">
                  <Bell size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Today's Workout Teaser - Now Clickable */}
          <div
            onClick={onViewAssignedWorkouts}
            className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 cursor-pointer hover:border-lime-400/50 transition-all hover:shadow-lg hover:shadow-lime-400/10"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Coach Assigned Workouts</h3>
                <p className="text-zinc-400 text-sm">View your personalized training plan</p>
              </div>


              <div className="w-10 h-10 bg-lime-400/10 rounded-full flex items-center justify-center">
                <ChevronRight size={20} className="text-lime-400" />
              </div>
            </div>

            <div className="flex items-center space-x-2 text-lime-400 bg-lime-400/5 p-3 rounded-2xl">
              <CheckCircle size={20} />
              <span className="font-bold text-sm">Tap to view your workout plans</span>
            </div>


          </div>
        </>
      )}
    </div>
  );
};