import React, { useState, useEffect } from 'react';
import { Menu, Bell } from 'lucide-react';
import { AppView, User, UserRole } from './types';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { CoachDashboard } from './components/CoachDashboard';
import { Workouts } from './components/Workouts';
import { MealScanner } from './components/MealScanner';
import { Chat } from './components/Chat';
import { Auth } from './components/Auth';
import { Leaderboard } from './components/Leaderboard';
import { Challenges } from './components/Challenges';
import { AthletesView } from './components/AthletesView';
import { Profile } from './components/Profile';
import { AdminDashboard } from './components/AdminDashboard';
import { WorkoutPlanCreator } from './components/WorkoutPlanCreator';
import { AssignedWorkouts } from './components/AssignedWorkouts';
import { CoachWorkoutHistory } from './components/CoachWorkoutHistory';
import { WorkoutTimer } from './components/WorkoutTimer';
import { mockCoaches } from './components/mockData';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChatRecipientId, setActiveChatRecipientId] = useState<string | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  // Workout Plan Creator State
  const [showWorkoutCreator, setShowWorkoutCreator] = useState(false);
  const [selectedAthleteForWorkout, setSelectedAthleteForWorkout] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          fetchProfile(session.user.id, session.user.email!);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Auth session error:", err);
        setError("Failed to connect to authentication service.");
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === UserRole.COACH) {
        fetchCoachTotalUnread();
      } else {
        fetchAthleteUnread();
      }
    }
  }, [user?.id]);

  useEffect(() => {
    // Optimistic clearing: If the user is currently in the CHAT view, 
    // we consider messages related to the active partner as "read" for notification purposes.
    if (currentView === AppView.CHAT) {
      setTotalUnreadCount(0);
    }
  }, [currentView]);

  const fetchCoachTotalUnread = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false);
    setTotalUnreadCount(count || 0);
  };

  const fetchAthleteUnread = async () => {
    if (!user?.selectedCoachId) return;
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', user.selectedCoachId)
      .eq('is_read', false);
    setTotalUnreadCount(count || 0);
  };

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUser({
          id: userId,
          email: email,
          name: data.name || email.split('@')[0],
          role: data.role as UserRole,
          avatarUrl: data.avatar_url || `https://i.pravatar.cc/150?u=${userId}`,
          streak: data.streak || 0,
          points: data.points || 0,
          gymCode: data.gym_code,
          selectedCoachId: data.selected_coach_id
        });
      } else {
        // Fallback if profile doesn't exist yet (should be created by trigger or Auth signup)
        // For now, we mock it or handle creating it here if needed using a simpler approach
        console.log("Profile not found, using default/mock for session");
        setUser({
          id: userId,
          email: email,
          name: email.split('@')[0],
          role: UserRole.ATHLETE, // Default
          avatarUrl: `https://i.pravatar.cc/150?u=${userId}`,
          streak: 0,
          points: 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setError("Could not load user profile. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCoach = async (coachId: string) => {
    if (user) {
      setUser({ ...user, selectedCoachId: coachId });
      const { error } = await supabase
        .from('profiles')
        .update({ selected_coach_id: coachId })
        .eq('id', user.id);

      if (error) {
        console.error("Error updating coach selection:", error);
      }
    }
  };

  const renderContent = () => {
    if (!user) return <Auth onLogin={() => { }} />; // Prop unused as Auth handles it via Supabase

    // Coach Views
    if (user.role === UserRole.COACH) {
      switch (currentView) {
        case AppView.DASHBOARD:
          return (
            <CoachDashboard
              coachName={user.name}
              coachId={user.id}
              unreadCount={totalUnreadCount}
              onChatAthlete={(athleteId) => {
                setActiveChatRecipientId(athleteId);
                setCurrentView(AppView.CHAT);
              }}
              onAssignWorkout={async (athleteId) => {
                // Fetch athlete name
                const { data: athleteData } = await supabase
                  .from('profiles')
                  .select('name')
                  .eq('id', athleteId)
                  .single();

                setSelectedAthleteForWorkout({
                  id: athleteId,
                  name: athleteData?.name || 'Athlete'
                });
                setShowWorkoutCreator(true);
              }}
              onViewWorkoutHistory={() => setCurrentView(AppView.WORKOUT_HISTORY)}
            />
          );
        case AppView.WORKOUTS:
          return (
            <Workouts
              athleteId={selectedAthleteId || undefined}
              isCoachView={true}
              onBack={() => {
                setSelectedAthleteId(null);
                setCurrentView(AppView.DASHBOARD);
              }}
            />
          );
        case AppView.ATHLETES:
          return (
            <AthletesView
              coachId={user.id}
              onChatAthlete={(athleteId) => {
                setActiveChatRecipientId(athleteId);
                setCurrentView(AppView.CHAT);
              }}
              onAssignWorkout={async (athleteId) => {
                const { data: athleteData } = await supabase
                  .from('profiles')
                  .select('name')
                  .eq('id', athleteId)
                  .single();

                setSelectedAthleteForWorkout({
                  id: athleteId,
                  name: athleteData?.name || 'Athlete'
                });
                setShowWorkoutCreator(true);
              }}
              onViewWorkoutHistory={() => setCurrentView(AppView.WORKOUT_HISTORY)}
            />
          );
        case AppView.CHAT:
          return (
            <Chat
              key={activeChatRecipientId || 'coach_chat'}
              currentUserId={user.id}
              selectedCoachId={activeChatRecipientId || undefined}
              isCoachView={true}
              onMessagesRead={user.role === UserRole.COACH ? fetchCoachTotalUnread : fetchAthleteUnread}
            />
          );
        case AppView.ALERTS:
          return <div className="p-6 text-white text-center mt-20">Risk Alerts (Coming Soon)</div>;
        case AppView.WORKOUT_HISTORY:
          return (
            <CoachWorkoutHistory
              coachId={user.id}
              onBack={() => setCurrentView(AppView.DASHBOARD)}
            />
          );
        case AppView.LEADERBOARD:
          return <Leaderboard />;
        case AppView.PROFILE:
        case AppView.STATS:
          return <Profile user={user} />;
        default:
          return <CoachDashboard coachName={user.name} />;
      }
    }

    // Admin Views
    if (user.role === UserRole.ADMIN) {
      switch (currentView) {
        case AppView.DASHBOARD:
          return <AdminDashboard />;
        case AppView.PROFILE:
          return <Profile user={user} />;
        case AppView.LEADERBOARD:
          return <Leaderboard />;
        default:
          return <AdminDashboard />;
      }
    }

    // Athlete Views
    switch (currentView) {
      case AppView.DASHBOARD:
        return (
          <Dashboard
            user={user}
            onSelectCoach={handleSelectCoach}
            onChatWithCoach={() => setCurrentView(AppView.CHAT)}
            onViewAssignedWorkouts={() => setCurrentView(AppView.ASSIGNED_WORKOUTS)}
            onOpenTimer={() => setCurrentView(AppView.TIMER)}
          />
        );
      case AppView.WORKOUTS:
        return <Workouts />;
      case AppView.ASSIGNED_WORKOUTS:
        return (
          <AssignedWorkouts
            athleteId={user.id}
            onBack={() => setCurrentView(AppView.DASHBOARD)}
          />
        );
      case AppView.TIMER:
      case 'timer' as any:
        return (
          <WorkoutTimer
            onBack={() => setCurrentView(AppView.DASHBOARD)}
          />
        );
      case AppView.CHALLENGES:
        return <Challenges />;
      case AppView.MEAL_SCAN:
        return <MealScanner />;
      case AppView.PROFILE:
      case AppView.STATS:
        return <Profile user={user} />;
      case AppView.CHAT:
        return (
          <Chat
            key={user.selectedCoachId || 'athlete_chat'}
            currentUserId={user.id}
            selectedCoachId={user.selectedCoachId}
            onMessagesRead={user.role === UserRole.COACH ? fetchCoachTotalUnread : fetchAthleteUnread}
          />
        );
      case AppView.LEADERBOARD:
        return <Leaderboard />;
      default:
        return (
          <Dashboard
            user={user}
            onSelectCoach={handleSelectCoach}
            onChatWithCoach={() => setCurrentView(AppView.CHAT)}
            onOpenTimer={() => setCurrentView(AppView.TIMER)}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-lime-400 font-medium animate-pulse">Loading GymSmart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 max-w-sm">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connection Issue</h2>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }


  if (!user) {
    return <Auth onLogin={() => { }} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-lime-400 selection:text-black">
      {/* Top Bar for Authenticated Users */}
      <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-white/5">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-white p-2 -ml-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <Menu size={24} />
        </button>

        {/* Logo / Title */}
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
          <span className="font-bold tracking-tight">GYM<span className="text-lime-400">SMART</span></span>
        </div>

        <button className="relative text-white p-2 -mr-2 hover:bg-zinc-800 rounded-full transition-colors">
          <Bell size={24} />
          {totalUnreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-950 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="px-6 pt-6 pb-24 max-w-md mx-auto">
        {renderContent()}
      </main>

      {/* Floating Chat Button (Athlete Only, and not in Chat View) */}
      {user.role === UserRole.ATHLETE && currentView !== AppView.CHAT && (
        <button
          onClick={() => setCurrentView(AppView.CHAT)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-lime-400 shadow-xl z-30 hover:scale-110 transition-transform"
        >
          {totalUnreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-800 animate-pulse"></div>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </button>
      )}

      {/* Bottom Navigation */}
      <BottomNav
        currentView={currentView}
        onChangeView={setCurrentView}
        role={user.role}
        unreadChatCount={user.role === UserRole.ATHLETE ? totalUnreadCount : 0}
        unreadAthletesCount={user.role === UserRole.COACH ? totalUnreadCount : 0}
      />

      {/* Workout Plan Creator Modal */}
      {showWorkoutCreator && selectedAthleteForWorkout && (
        <WorkoutPlanCreator
          coachId={user.id}
          athleteId={selectedAthleteForWorkout.id}
          athleteName={selectedAthleteForWorkout.name}
          onClose={() => {
            setShowWorkoutCreator(false);
            setSelectedAthleteForWorkout(null);
          }}
          onSuccess={() => {
            setShowWorkoutCreator(false);
            setSelectedAthleteForWorkout(null);
          }}
        />
      )}
    </div>
  );
};

export default App;