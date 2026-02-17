
import React, { useEffect, useState } from 'react';
import { repository } from '../services/repository';
import { Pillar, WorkoutSession } from '../types';
import { getDaysSince, getStatusBg, getStatusColor, getOverdueScore } from '../utils';
import { Play, Dumbbell, ArrowUpCircle, Calendar } from 'lucide-react';
import PillarDetailOverlay from './PillarDetailOverlay';
import { calculateWeeksMetYTD } from '../services/stats';

interface DashboardProps {
  onStart: () => void;
  onStartSpecificWorkout?: (pillar: Pillar) => void;
  currentView?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onStart, onStartSpecificWorkout, currentView }) => {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selectedPillar, setSelectedPillar] = useState<Pillar | null>(null);
  const now = Date.now();

  useEffect(() => {
    if (currentView === 'dashboard') {
      repository.getActivePillars().then(setPillars);
      repository.getAllSessions().then(setSessions);
    }
  }, [currentView]);

  const sortedPillars = [...pillars].sort((a, b) => {
    const scoreA = getOverdueScore(a, now);
    const scoreB = getOverdueScore(b, now);
    return scoreB - scoreA;
  });

  const weeksMet = calculateWeeksMetYTD(sessions, now);

  return (
    <div 
      className="pt-4 px-4 pb-8 flex flex-col gap-4 max-w-lg mx-auto min-h-screen"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <h2 className="text-lg font-bold text-white tracking-tight">Ready for a session?</h2>
        <button 
          onClick={onStart}
          className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Play size={18} fill="currentColor" />
          START WORKOUT
        </button>
      </div>

      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-gray-400 font-semibold uppercase text-xs tracking-wider">Pillar Status</h3>
        </div>
        <div className="flex flex-col gap-3">
          {sortedPillars.map(p => {
            const daysSince = getDaysSince(p.lastCountedAt, now);
            const status = getStatusColor(p, now);
            const isStagnating = p.enableOverloadTracking && (p.totalWorkouts || 0) >= (p.overloadThreshold || 5);

            // Force "Remaining" logic
            const daysRemaining = p.cadenceDays - daysSince;
            const isOverdue = daysRemaining < 0;
            const neverDone = p.lastCountedAt === null;
            
            let displayValue: string;
            let displayLabel: string;
            let valueColor: string;

            if (neverDone) {
              displayValue = "---";
              displayLabel = "No Data";
              valueColor = "text-gray-600";
            } else {
              displayValue = `${daysRemaining}d`;
              displayLabel = isOverdue ? "Overdue by" : "Remaining";
              valueColor = isOverdue ? 'text-red-400' : (daysRemaining <= 1 ? 'text-yellow-400' : 'text-gray-300');
            }

            return (
              <button 
                key={p.id} 
                onClick={() => setSelectedPillar(p)}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 active:scale-[0.98] transition-all text-left w-full"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusBg(status)} shadow-[0_0_8px] shadow-current`} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-gray-100">{p.name}</h4>
                      {isStagnating && <ArrowUpCircle size={14} className="text-amber-500" />}
                    </div>
                    <p className="text-xs text-gray-500">{p.muscleGroup}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${valueColor}`}>
                    {displayValue}
                  </span>
                  <p className="text-[10px] text-gray-600 uppercase">{displayLabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 p-3 rounded-xl">
            <Calendar className="text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider mb-0.5">Yearly Consistency</h3>
            <p className="text-xl font-bold text-white">
              {weeksMet} <span className="text-sm font-normal text-gray-400">Weeks Met</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 uppercase font-medium">Goal: 5+ Pillars/Week</p>
        </div>
      </section>

      {selectedPillar && (
        <PillarDetailOverlay 
          pillar={selectedPillar} 
          onClose={() => setSelectedPillar(null)} 
          onStartWorkout={(p) => {
            setSelectedPillar(null);
            onStartSpecificWorkout?.(p);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
