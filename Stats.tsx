import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis } from 'recharts';
import { Activity, Footprints, Clock, Flame } from 'lucide-react';

const data = [
  { day: 'M', val: 40 },
  { day: 'T', val: 70 },
  { day: 'W', val: 50 },
  { day: 'T', val: 85 },
  { day: 'F', val: 60 },
  { day: 'S', val: 90 },
  { day: 'S', val: 30 },
];

export const Stats: React.FC = () => {
  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="flex justify-between items-end">
        <h1 className="text-2xl font-bold text-white">Statistics</h1>
        <div className="flex space-x-2">
           <select className="bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-lg border border-zinc-800 outline-none">
             <option>September</option>
           </select>
           <select className="bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-lg border border-zinc-800 outline-none">
             <option>Week 1</option>
           </select>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
        <div className="flex justify-between items-center mb-6">
           <div>
             <p className="text-zinc-500 text-xs mb-1">Total Calories</p>
             <div className="flex items-baseline space-x-1">
               <span className="text-3xl font-bold text-white">239</span>
               <span className="text-lime-400 font-medium text-sm">kcal</span>
             </div>
           </div>
        </div>
        
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 12 }} 
                dy={10}
              />
              <Bar dataKey="val" radius={[4, 4, 4, 4]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.day === 'T' || entry.day === 'S' ? '#a3e635' : '#27272a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-3">
          <div className="flex justify-between items-start">
             <span className="text-zinc-500 text-xs">Heart Rate</span>
             <Activity size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-white">92<span className="text-sm font-normal text-zinc-500 ml-1">bpm</span></p>
        </div>

        <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-3">
          <div className="flex justify-between items-start">
             <span className="text-zinc-500 text-xs">Steps</span>
             <Footprints size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-white">1.279</p>
        </div>

        <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-3">
          <div className="flex justify-between items-start">
             <span className="text-zinc-500 text-xs">Distance</span>
             <Flame size={16} className="text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-white">56<span className="text-sm font-normal text-zinc-500 ml-1">km</span></p>
        </div>

         <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 space-y-3">
          <div className="flex justify-between items-start">
             <span className="text-zinc-500 text-xs">Time</span>
             <Clock size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-white">3h 32<span className="text-sm font-normal text-zinc-500 ml-1">min</span></p>
        </div>
      </div>
    </div>
  );
};