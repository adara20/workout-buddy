
import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { Pillar } from '../types';
import { getDaysSince, getStatusBg, getStatusColor } from '../utils';
import { Play, Dumbbell, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  onStart: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onStart }) => {
  const [pillars, setPillars] = useState<Pillar[]>([]);

  useEffect(() => {
    db.pillars.toArray().then(setPillars);
  }, []);

  const sortedPillars = [...pillars].sort((a, b) => {
    const scoreA = getDaysSince(a.lastCountedAt) / a.cadenceDays;
    const scoreB = getDaysSince(b.lastCountedAt) / b.cadenceDays;
    return scoreB - scoreA;
  });

  return (
    <div className="p-4 flex flex-col gap-6 max-w-lg mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Workout Buddy</h1>
          <p className="text-gray-400 text-sm">Track your pillars, maintain your strength.</p>
        </div>
        <div className="bg-gray-800 p-2 rounded-full">
          <Dumbbell className="text-blue-500" />
        </div>
      </header>

      <div className="bg-blue-600 rounded-2xl p-6 shadow-lg shadow-blue-900/20 flex flex-col items-center text-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Ready for a session?</h2>
          <p className="text-blue-100 text-sm">Pillars will be recommended based on your rotation needs.</p>
        </div>
        <button 
          onClick={onStart}
          className="bg-white text-blue-600 font-bold py-3 px-8 rounded-full flex items-center gap-2 hover:bg-gray-100 transition-colors w-full justify-center"
        >
          <Play size={20} fill="currentColor" />
          START WORKOUT
        </button>
      </div>

      <section>
        <h3 className="text-gray-400 font-semibold uppercase text-xs tracking-wider mb-3">Pillar Status</h3>
        <div className="flex flex-col gap-3">
          {sortedPillars.map(p => {
            const daysSince = getDaysSince(p.lastCountedAt);
            const status = getStatusColor(p);
            return (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusBg(status)} shadow-[0_0_8px] shadow-current`} />
                  <div>
                    <h4 className="font-semibold text-gray-100">{p.name}</h4>
                    <p className="text-xs text-gray-500">{p.muscleGroup}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${daysSince > p.cadenceDays ? 'text-red-400' : 'text-gray-300'}`}>
                    {daysSince === 999 ? 'Never' : `${daysSince}d`}
                  </span>
                  <p className="text-[10px] text-gray-600 uppercase">Since last count</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
