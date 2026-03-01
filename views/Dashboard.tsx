
import React, { useEffect, useState } from 'react';
import { repository } from '../services/repository';
import { Pillar, WorkoutSession } from '../types';
import { getDaysSince, getStatusBg, getStatusColor, getOverdueScore } from '../utils';
import { Play, ArrowUpCircle, Calendar } from 'lucide-react';
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
    <div className="pt-5 px-4 pb-8 flex flex-col gap-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white leading-none">
            Workout Buddy
          </h1>
          <p className="font-display text-xs text-gray-600 uppercase tracking-[0.2em] mt-0.5">
            Ready for a session?
          </p>
        </div>
        <button
          onClick={onStart}
          className="bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-black font-display font-black py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors uppercase tracking-wider text-sm"
        >
          <Play size={15} fill="currentColor" />
          START WORKOUT
        </button>
      </div>

      {/* Pillar Status */}
      <section>
        <h3 className="font-display text-[10px] text-gray-600 uppercase tracking-[0.25em] mb-3">Pillar Status</h3>
        <div className="flex flex-col gap-2">
          {sortedPillars.map(p => {
            const daysSince = getDaysSince(p.lastCountedAt, now);
            const status = getStatusColor(p, now);
            const isStagnating = p.enableOverloadTracking && (p.totalWorkouts || 0) >= (p.overloadThreshold || 5);

            const daysRemaining = p.cadenceDays - daysSince;
            const isOverdue = daysRemaining < 0;
            const neverDone = p.lastCountedAt === null;

            let displayValue: string;
            let displayLabel: string;
            let valueColor: string;

            if (neverDone) {
              displayValue = '---';
              displayLabel = 'No Data';
              valueColor = 'text-gray-600';
            } else {
              displayValue = `${daysRemaining}d`;
              displayLabel = isOverdue ? 'Overdue by' : 'Remaining';
              valueColor = isOverdue ? 'text-red-400' : (daysRemaining <= 1 ? 'text-yellow-400' : 'text-gray-300');
            }

            const barColor = neverDone ? 'bg-gray-800' : getStatusBg(status);

            return (
              <button
                key={p.id}
                onClick={() => setSelectedPillar(p)}
                className="relative bg-gray-900/70 border border-gray-800 rounded-xl overflow-hidden flex items-center justify-between w-full text-left hover:border-gray-700 active:scale-[0.98] transition-all"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${barColor}`} />
                <div className="py-3.5 pl-5 pr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-semibold text-lg uppercase tracking-wider text-gray-100 leading-none">
                      {p.name}
                    </h4>
                    {isStagnating && <ArrowUpCircle size={13} className="text-amber-500" />}
                  </div>
                  <p className="font-display text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">
                    {p.muscleGroup}
                  </p>
                </div>
                <div className="text-right pr-4 py-3.5">
                  <span className={`font-display text-2xl font-bold leading-none ${valueColor}`}>
                    {displayValue}
                  </span>
                  <p className="font-display text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">
                    {displayLabel}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Consistency */}
      <section className="bg-gray-900/70 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="text-gray-600" size={20} />
          <div>
            <p className="font-display text-[10px] text-gray-600 uppercase tracking-[0.2em]">Yearly Consistency</p>
            <p className="font-display text-2xl font-black text-white leading-tight">
              {weeksMet} <span className="text-sm font-medium text-gray-500">Weeks Met</span>
            </p>
          </div>
        </div>
        <p className="font-display text-[9px] text-gray-700 uppercase tracking-wider text-right">
          Goal<br/>5+ / Wk
        </p>
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
