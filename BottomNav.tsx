import React from 'react';
import { Home, Play, BarChart2, User, Camera, LayoutDashboard, Users, MessageSquare, Bell, Trophy, Utensils, Hexagon, Clock } from 'lucide-react';
import { AppView, UserRole } from '../types';

interface BottomNavProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  role: UserRole;
  unreadChatCount?: number;
  unreadAthletesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChangeView, role, unreadChatCount = 0, unreadAthletesCount = 0 }) => {

  const athleteItems = [
    { view: AppView.DASHBOARD, icon: Home, label: 'Home' },
    { view: AppView.WORKOUTS, icon: Play, label: 'Workouts' },
    { view: AppView.MEAL_SCAN, icon: Camera, label: 'Scan', isAction: true },
    { view: AppView.TIMER, icon: Clock, label: 'Timer' },
    { view: AppView.PROFILE, icon: User, label: 'Profile', badge: unreadChatCount },
  ];

  const coachItems = [
    { view: AppView.DASHBOARD, icon: Home, label: 'Dash' },
    { view: AppView.ATHLETES, icon: Users, label: 'Athletes', badge: unreadAthletesCount },
    { view: AppView.CHAT, icon: MessageSquare, label: 'Chat', isAction: true },
    { view: AppView.LEADERBOARD, icon: Trophy, label: 'Ranking' },
    { view: AppView.PROFILE, icon: User, label: 'Profile' },
  ];

  const adminItems = [
    { view: AppView.DASHBOARD, icon: Home, label: 'Dash' },
    { view: AppView.ATHLETES, icon: Users, label: 'Athletes' },
    { view: AppView.LEADERBOARD, icon: Trophy, label: 'Ranking' },
    { view: AppView.PROFILE, icon: User, label: 'Profile' },
  ].map(item => ({ ...item, badge: undefined, isAction: false }));

  const navItems = role === UserRole.COACH ? coachItems : role === UserRole.ADMIN ? adminItems : athleteItems;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/10 px-4 py-4 pb-6 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <button
                key={item.view}
                onClick={() => onChangeView(item.view)}
                className={`flex items-center justify-center w-14 h-14 -mt-6 rounded-full transition-all shadow-lg shadow-lime-500/20 border-4 border-black ${isActive ? 'bg-lime-400 text-black scale-110' : 'bg-lime-400 text-black'
                  }`}
              >
                <Icon size={24} strokeWidth={2.5} />
              </button>
            );
          }

          return (
            <button
              key={item.view}
              onClick={() => onChangeView(item.view)}
              className={`flex flex-col items-center justify-center transition-colors px-2 relative ${isActive ? 'text-lime-400' : 'text-zinc-600 hover:text-zinc-400'
                }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-0 right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-black">
                  {item.badge}
                </span>
              )}
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};