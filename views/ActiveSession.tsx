
import React, { useState, useEffect } from 'react';
import { repository } from '../services/repository';
import { WorkoutSession, Accessory, Pillar, PillarEntry, AccessoryEntry } from '../types';
import { calculatePillarEntryUpdate, calculatePillarUpdate } from '../services/session';
import { X, CheckCircle2, TrendingUp, AlertCircle, Plus, Check } from 'lucide-react';

interface ActiveSessionProps {
  initialSession: WorkoutSession;
  onComplete: (session: WorkoutSession) => void;
  onCancel: () => void;
}

const ActiveSession: React.FC<ActiveSessionProps> = ({ initialSession, onComplete, onCancel }) => {
  const [session, setSession] = useState<WorkoutSession>(initialSession);
  const [allAccessories, setAllAccessories] = useState<Accessory[]>([]);
  const [pillarsData, setPillarsData] = useState<Record<string, Pillar>>({});
  const [targetExercises, setTargetExercises] = useState(4);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    repository.getAllAccessories().then(setAllAccessories);
    repository.getAllPillars().then(p => {
      const map = p.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
      setPillarsData(map);
    });
    repository.getConfig().then(cfg => cfg && setTargetExercises(cfg.targetExercisesPerSession));
  }, []);

  const updateWeight = (pillarId: string, delta: number) => {
    setSession(prev => {
      const updatedPillars = prev.pillarsPerformed.map(p => {
        if (p.pillarId === pillarId) {
          return calculatePillarEntryUpdate(p, pillarsData[pillarId], delta);
        }
        return p;
      });
      return { ...prev, pillarsPerformed: updatedPillars };
    });
  };

  const toggleAccessory = (acc: Accessory) => {
    setSession(prev => {
      const existing = prev.accessoriesPerformed.find(a => a.accessoryId === acc.id);
      if (existing) {
        return {
          ...prev,
          accessoriesPerformed: prev.accessoriesPerformed.filter(a => a.accessoryId !== acc.id)
        };
      } else {
        return {
          ...prev,
          accessoriesPerformed: [...prev.accessoriesPerformed, {
            accessoryId: acc.id,
            name: acc.name,
            didPerform: true
          }]
        };
      }
    });
  };

  const handleFinish = async () => {
    await repository.addSession(session);
    onComplete(session);
  };

  const totalExercises = session.pillarsPerformed.length + session.accessoriesPerformed.length;
  const needsMore = totalExercises < targetExercises;

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between pt-1">
        <button onClick={onCancel} className="text-gray-600 p-2"><X size={20} /></button>
        <div className="text-center">
          <h2 className="font-display text-xl font-black uppercase tracking-widest text-white">Session</h2>
          <p className="font-display text-[10px] text-gray-600 uppercase tracking-widest">
            {totalExercises}/{targetExercises} Target
          </p>
        </div>
        <button onClick={handleFinish} className="font-display font-black text-orange-500 text-sm tracking-widest uppercase p-2">DONE</button>
      </header>

      <section className="flex flex-col gap-3">
        <h3 className="font-display text-[10px] text-gray-600 uppercase tracking-[0.25em]">Logging Pillars</h3>
        {session.pillarsPerformed.map(pEntry => {
          const pInfo = pillarsData[pEntry.pillarId];
          return (
            <div key={pEntry.pillarId} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-display text-2xl font-bold uppercase tracking-wider leading-none">{pEntry.name}</h4>
                  <div className="flex gap-2 items-center mt-2">
                    {pEntry.counted ? (
                      <span className="font-display text-[10px] flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-0.5 rounded font-bold border border-green-500/20 uppercase tracking-wider">
                        <CheckCircle2 size={10} /> Counted
                      </span>
                    ) : (
                      <span className="font-display text-[10px] flex items-center gap-1 bg-gray-800 text-gray-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        DNP — Min: {pInfo?.minWorkingWeight}lb
                      </span>
                    )}
                    {pEntry.isPR && (
                      <span className="font-display text-[10px] flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded font-bold border border-yellow-500/20 uppercase tracking-wider">
                        <TrendingUp size={10} /> PR
                      </span>
                    )}
                    {pEntry.warning && (
                      <span className="font-display text-[10px] flex items-center gap-1 bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold border border-red-500/20 uppercase tracking-wider">
                        <AlertCircle size={10} /> Low
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-[9px] text-gray-600 uppercase tracking-widest">PR</p>
                  <p className="font-display font-bold text-gray-400 text-lg leading-none">{pInfo?.prWeight || 0}<span className="text-xs font-normal">lb</span></p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center flex-1">
                  <span className="font-display text-8xl font-black text-white leading-none tabular-nums">{pEntry.weight}</span>
                  <span className="font-display text-[10px] text-gray-600 uppercase tracking-[0.35em] mt-1">LBS</span>
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateWeight(pEntry.pillarId, -5)}
                      className="flex-1 h-14 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-lg flex items-center justify-center font-display font-bold text-lg text-gray-300 transition-colors"
                    >
                      -5
                    </button>
                    <button
                      onClick={() => updateWeight(pEntry.pillarId, 5)}
                      className="flex-1 h-14 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-lg flex items-center justify-center font-display font-bold text-lg text-white transition-colors"
                    >
                      +5
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateWeight(pEntry.pillarId, -45)}
                      className="flex-1 h-14 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-lg flex items-center justify-center font-display font-bold text-lg text-gray-400 transition-colors"
                    >
                      -45
                    </button>
                    <button
                      onClick={() => updateWeight(pEntry.pillarId, 45)}
                      className="flex-1 h-14 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-lg flex items-center justify-center font-display font-bold text-lg text-white transition-colors"
                    >
                      +45
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-[10px] text-gray-600 uppercase tracking-[0.25em]">Accessories</h3>
            {needsMore && <span className="font-display text-[10px] text-yellow-500 font-black uppercase tracking-wider animate-pulse">+{targetExercises - totalExercises} needed</span>}
          </div>
          {(() => {
            const linkedIds = Array.from(new Set(
              session.pillarsPerformed.flatMap(p => pillarsData[p.pillarId]?.preferredAccessoryIds || [])
            ));
            if (linkedIds.length === 0) return null;
            return (
              <button
                onClick={() => setShowAll(!showAll)}
                className="font-display text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-gray-800 text-gray-600 hover:border-gray-700"
              >
                {showAll ? 'Recommended' : 'Show All'}
              </button>
            );
          })()}
        </div>
        <div className="flex flex-wrap gap-2">
          {(() => {
            const linkedIds = Array.from(new Set(
              session.pillarsPerformed.flatMap(p => pillarsData[p.pillarId]?.preferredAccessoryIds || [])
            ));
            const filtered = showAll || linkedIds.length === 0
              ? allAccessories
              : allAccessories.filter(acc => linkedIds.includes(acc.id));

            return filtered.map(acc => {
              const isDone = !!session.accessoriesPerformed.find(a => a.accessoryId === acc.id);
              return (
                <button
                  key={acc.id}
                  onClick={() => toggleAccessory(acc)}
                  className={`px-3 py-1.5 rounded-lg border font-display font-bold text-sm uppercase tracking-wide transition-all flex items-center gap-1.5 ${
                    isDone
                      ? 'bg-orange-500 border-orange-500 text-black'
                      : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'
                  }`}
                >
                  {isDone ? <Check size={12} /> : <Plus size={12} />}
                  {acc.name}
                </button>
              );
            });
          })()}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-display text-[10px] text-gray-600 uppercase tracking-[0.25em]">Session Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-3">
            <label className="font-display text-[10px] text-gray-600 uppercase tracking-widest block mb-1">Minutes</label>
            <input
              type="number"
              placeholder="0"
              className="bg-transparent w-full font-display text-2xl font-black outline-none text-white placeholder-gray-700"
              value={session.durationMinutes || ''}
              onChange={e => setSession({...session, durationMinutes: parseInt(e.target.value) || 0})}
            />
          </div>
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-3">
            <label className="font-display text-[10px] text-gray-600 uppercase tracking-widest block mb-1">Calories</label>
            <input
              type="number"
              placeholder="0"
              className="bg-transparent w-full font-display text-2xl font-black outline-none text-white placeholder-gray-700"
              value={session.calories || ''}
              onChange={e => setSession({...session, calories: parseInt(e.target.value) || 0})}
            />
          </div>
        </div>
        <textarea
          placeholder="Session notes..."
          className="bg-gray-900/70 border border-gray-800 rounded-xl p-4 font-display text-base outline-none h-20 resize-none placeholder-gray-700"
          value={session.notes || ''}
          onChange={e => setSession({...session, notes: e.target.value})}
        />
      </section>

      <button
        onClick={handleFinish}
        className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-black font-display font-black py-4 rounded-xl flex items-center justify-center gap-2 mt-2 uppercase tracking-widest text-lg transition-colors"
      >
        FINISH & SAVE SESSION
      </button>
    </div>
  );
};

export default ActiveSession;
