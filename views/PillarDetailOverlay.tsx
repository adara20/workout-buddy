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
      <div className="relative w-full max-w-lg bg-gray-900 border-t sm:border border-gray-800 rounded-t-[2rem] sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-10 duration-300">
        <div className="p-6 sm:p-8 flex flex-col gap-6">

          <header className="flex justify-between items-start">
            <div>
              <h2 className="font-display text-4xl font-black uppercase tracking-tight text-white leading-none mb-2">{activePillar.name}</h2>
              <span className="font-display bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border border-orange-500/20">
                {activePillar.muscleGroup}
              </span>
            </div>
            <button
              onClick={onClose}
              className="bg-gray-800 text-gray-500 p-2 rounded-lg hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </header>

          {showLevelUp ? (
            <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-xl text-center">
                <ArrowUpCircle size={28} className="text-amber-500 mx-auto mb-3" />
                <h3 className="font-display text-amber-500 font-black text-xl uppercase tracking-wide">Time to Level Up?</h3>
                <p className="font-display text-gray-500 text-sm mt-1 uppercase tracking-wide">
                  {activePillar.totalWorkouts} sessions at {activePillar.minWorkingWeight}lb — increase to reset count.
                </p>
              </div>

              <div className="flex items-center justify-center gap-6 py-2">
                <button
                  onClick={() => setNewWeight(Math.max(activePillar.minWorkingWeight + 5, newWeight - 5))}
                  className="w-12 h-12 rounded-lg bg-gray-800 text-white font-display font-black text-xl flex items-center justify-center active:bg-gray-700"
                >
                  −
                </button>
                <div className="flex flex-col items-center">
                  <span className="font-display text-6xl font-black text-white leading-none">{newWeight}</span>
                  <span className="font-display text-[10px] text-gray-600 uppercase tracking-[0.3em] mt-1">Target (lbs)</span>
                </div>
                <button
                  onClick={() => setNewWeight(newWeight + 5)}
                  className="w-12 h-12 rounded-lg bg-gray-800 text-white font-display font-black text-xl flex items-center justify-center active:bg-gray-700"
                >
                  +
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLevelUp(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-500 font-display font-black uppercase tracking-widest text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLevelUp}
                  className="flex-1 py-3 px-6 rounded-xl bg-amber-500 text-black font-display font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors"
                >
                  <CheckCircle2 size={15} /> Confirm & Reset
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-950/60 border border-gray-800 p-3 rounded-xl flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-yellow-500 mb-1">
                    <Trophy size={12} />
                    <span className="font-display text-[9px] font-black uppercase tracking-widest">PR</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-display text-2xl font-black text-white">{activePillar.prWeight}</span>
                    <span className="font-display text-[10px] text-gray-600">lb</span>
                  </div>
                </div>

                <div className="bg-gray-950/60 border border-gray-800 p-3 rounded-xl flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-orange-500 mb-1">
                    <Target size={12} />
                    <span className="font-display text-[9px] font-black uppercase tracking-widest">Min</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-display text-2xl font-black text-white">{activePillar.minWorkingWeight}</span>
                    <span className="font-display text-[10px] text-gray-600">lb</span>
                  </div>
                </div>

                <button
                  onClick={() => isStagnating && setShowLevelUp(true)}
                  disabled={!isStagnating}
                  className={`border p-3 rounded-xl flex flex-col gap-1 transition-all text-left ${
                    isStagnating
                      ? 'bg-amber-500/10 border-amber-500/30 cursor-pointer hover:bg-amber-500/20 active:scale-95'
                      : 'bg-gray-950/60 border-gray-800 cursor-default'
                  }`}
                >
                  <div className={`flex items-center gap-1.5 mb-1 ${isStagnating ? 'text-amber-500' : 'text-emerald-500'}`}>
                    <Hash size={12} />
                    <span className="font-display text-[9px] font-black uppercase tracking-widest">
                      {isStagnating ? 'Level Up?' : 'Count'}
                    </span>
                  </div>
                  <span className={`font-display text-2xl font-black ${isStagnating ? 'text-amber-400' : 'text-white'}`}>
                    {activePillar.totalWorkouts || 0}
                  </span>
                </button>
              </div>

              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp size={14} />
                  <h3 className="font-display text-[10px] font-black uppercase tracking-widest">Progression Trend</h3>
                </div>
                <PillarTrendChart data={history} />
              </section>

              {activePillar.notes && (
                <section className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-orange-400">
                    <ClipboardList size={14} />
                    <h3 className="font-display text-[10px] font-black uppercase tracking-[0.2em]">Coaching Cues</h3>
                  </div>
                  <MarkdownLite text={activePillar.notes} />
                </section>
              )}

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Dumbbell size={14} className="text-gray-600" />
                  <h3 className="font-display text-[10px] font-black text-gray-600 uppercase tracking-widest">Associated Accessories</h3>
                </div>

                {loading ? (
                  <div className="flex gap-2 animate-pulse">
                    <div className="h-7 w-20 bg-gray-800 rounded-lg" />
                    <div className="h-7 w-28 bg-gray-800 rounded-lg" />
                  </div>
                ) : accessories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {accessories.map(acc => (
                      <span
                        key={acc.id}
                        className="font-display bg-gray-800 text-gray-400 text-sm font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg border border-gray-700"
                      >
                        {acc.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-display text-sm text-gray-700 uppercase tracking-wider">No accessories linked.</p>
                )}
              </section>

              <footer>
                <button
                  onClick={() => onStartWorkout(activePillar)}
                  className="w-full bg-orange-500 hover:bg-orange-400 text-black font-display font-black py-4 rounded-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all uppercase tracking-widest text-lg"
                >
                  <Play size={18} fill="currentColor" />
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
