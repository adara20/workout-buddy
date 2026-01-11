import React, { useEffect, useState } from 'react';
import { Pillar, Accessory, WorkoutSession } from '../types';
import { repository } from '../services/repository';
import { X, Trophy, Target, Dumbbell, Play, ClipboardList, TrendingUp, Hash, ArrowUpCircle, CheckCircle2 } from 'lucide-react';
import { MarkdownLite } from './MarkdownLite';
import { extractPillarHistory, ChartDataPoint } from '../services/stats';
import PillarTrendChart from './PillarTrendChart';

interface PillarDetailOverlayProps {
  pillar: Pillar;
  onClose: () => void;
  onStartWorkout: (pillar: Pillar) => void;
}

const PillarDetailOverlay: React.FC<PillarDetailOverlayProps> = ({ pillar, onClose, onStartWorkout }) => {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Local state to handle immediate updates (like Level Up) without waiting for parent refresh
  const [activePillar, setActivePillar] = useState(pillar);

  // Progressive Overload State
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newWeight, setNewWeight] = useState(pillar.minWorkingWeight + 5);

  // Sync local state if prop changes (e.g. parent eventually refreshes)
  useEffect(() => {
    setActivePillar(pillar);
    setNewWeight(pillar.minWorkingWeight + 5);
  }, [pillar]);

  const isStagnating = activePillar.enableOverloadTracking && (activePillar.totalWorkouts || 0) >= (activePillar.overloadThreshold || 5);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allAccs, sessions] = await Promise.all([
          repository.getAllAccessories(),
          repository.getSessionsByPillar(activePillar.id)
        ]);
        
        const filteredAccs = allAccs.filter(acc => (activePillar.preferredAccessoryIds || []).includes(acc.id));
        setAccessories(filteredAccs);
        
        const chartData = extractPillarHistory(sessions, activePillar.id);
        setHistory(chartData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activePillar]); // Re-fetch if activePillar changes (e.g. weight update might conceptually affect things, though mostly history)

  const handleLevelUp = async () => {
    await repository.updatePillar(activePillar.id, { minWorkingWeight: newWeight });
    
    // Update local state to reflect change immediately
    setActivePillar(prev => ({
      ...prev,
      minWorkingWeight: newWeight,
      totalWorkouts: 0
    }));
    
    setShowLevelUp(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Sheet/Modal */}
      <div className="relative w-full max-w-lg bg-gray-900 border-t sm:border border-gray-800 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        <div className="p-6 sm:p-8 flex flex-col gap-8">
          
          <header className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-2">{activePillar.name}</h2>
              <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-blue-500/20">
                {activePillar.muscleGroup}
              </span>
            </div>
            <button 
              onClick={onClose}
              className="bg-gray-800 text-gray-400 p-2 rounded-full hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </header>

          {showLevelUp ? (
            <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl text-center">
                 <ArrowUpCircle size={32} className="text-amber-500 mx-auto mb-3" />
                 <h3 className="text-amber-500 font-black text-lg uppercase tracking-wide">Time to Level Up?</h3>
                 <p className="text-gray-400 text-sm mt-1">
                   You've crushed {activePillar.totalWorkouts} workouts at {activePillar.minWorkingWeight}lbs. 
                   Increase your working weight to reset your progress count.
                 </p>
              </div>

              <div className="flex items-center justify-center gap-4 py-4">
                <button 
                  onClick={() => setNewWeight(Math.max(activePillar.minWorkingWeight + 5, newWeight - 5))}
                  className="w-12 h-12 rounded-full bg-gray-800 text-white font-bold text-xl flex items-center justify-center active:bg-gray-700"
                >
                  -
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-black text-white tracking-tighter">{newWeight}</span>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Target Weight (lbs)</span>
                </div>
                <button 
                  onClick={() => setNewWeight(newWeight + 5)}
                  className="w-12 h-12 rounded-full bg-gray-800 text-white font-bold text-xl flex items-center justify-center active:bg-gray-700"
                >
                  +
                </button>
              </div>

              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setShowLevelUp(false)}
                  className="flex-1 py-4 rounded-2xl bg-gray-800 text-gray-400 font-bold uppercase text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLevelUp}
                  className="flex-2 py-4 px-8 rounded-2xl bg-amber-500 text-black font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors"
                >
                  <CheckCircle2 size={16} /> Confirm & Reset
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-950/50 border border-gray-800 p-3 rounded-2xl flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-yellow-500 mb-1">
                    <Trophy size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">PR</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-white">{activePillar.prWeight}</span>
                    <span className="text-[10px] text-gray-500 font-bold">lb</span>
                  </div>
                </div>

                <div className="bg-gray-950/50 border border-gray-800 p-3 rounded-2xl flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-blue-500 mb-1">
                    <Target size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Work</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-white">{activePillar.minWorkingWeight}</span>
                    <span className="text-[10px] text-gray-500 font-bold">lb</span>
                  </div>
                </div>

                <button 
                  onClick={() => isStagnating && setShowLevelUp(true)}
                  disabled={!isStagnating}
                  className={`border p-3 rounded-2xl flex flex-col gap-1 transition-all text-left ${
                    isStagnating 
                      ? 'bg-amber-500/10 border-amber-500/30 cursor-pointer hover:bg-amber-500/20 active:scale-95' 
                      : 'bg-gray-950/50 border-gray-800 cursor-default'
                  }`}
                >
                  <div className={`flex items-center gap-2 mb-1 ${isStagnating ? 'text-amber-500' : 'text-emerald-500'}`}>
                    <Hash size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {isStagnating ? 'Level Up?' : 'Count'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-black ${isStagnating ? 'text-amber-400' : 'text-white'}`}>
                      {activePillar.totalWorkouts || 0}
                    </span>
                  </div>
                </button>
              </div>

              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-gray-500">
                  <TrendingUp size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Progression Trend</h3>
                </div>
                <PillarTrendChart data={history} />
              </section>

              {activePillar.notes && (
                <section className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-3xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <ClipboardList size={16} />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Coaching Cues</h3>
                  </div>
                  <MarkdownLite text={activePillar.notes} />
                </section>
              )}

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Dumbbell size={16} className="text-gray-500" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Associated Accessories</h3>
                </div>
                
                {loading ? (
                  <div className="flex gap-2 animate-pulse">
                    <div className="h-8 w-24 bg-gray-800 rounded-full" />
                    <div className="h-8 w-32 bg-gray-800 rounded-full" />
                  </div>
                ) : accessories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {accessories.map(acc => (
                      <span 
                        key={acc.id}
                        className="bg-gray-800 text-gray-300 text-xs font-semibold px-4 py-2 rounded-full border border-gray-700"
                      >
                        {acc.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 italic">No preferred accessories linked.</p>
                )}
              </section>

              <footer className="mt-2">
                <button
                  onClick={() => onStartWorkout(activePillar)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-900/40 active:scale-[0.98] transition-all"
                >
                  <Play size={20} fill="currentColor" />
                  START SESSION
                </button>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PillarDetailOverlay;
