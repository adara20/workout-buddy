
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
    const now = Date.now();
    
    await repository.runTransaction('rw', ['workout_sessions', 'pillars'], async () => {
      // 1. Save Session
      await repository.addSession(session);
      
      // 2. Update Pillar Stats
      for (const pEntry of session.pillarsPerformed) {
        const pInfo = pillarsData[pEntry.pillarId];
        if (!pInfo) continue;
        
        const updates = calculatePillarUpdate(pEntry, now);
        await repository.updatePillar(pEntry.pillarId, updates);
      }
    });
    onComplete(session);
  };

  const totalExercises = session.pillarsPerformed.length + session.accessoriesPerformed.length;
  const needsMore = totalExercises < targetExercises;

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <button onClick={onCancel} className="text-gray-400 p-2"><X /></button>
        <div>
          <h2 className="text-xl font-bold text-center">Workout Session</h2>
          <p className="text-xs text-center text-gray-500">
            {new Date(session.date).toLocaleDateString()} • {totalExercises} / {targetExercises} Target
          </p>
        </div>
        <button onClick={handleFinish} className="text-blue-500 font-bold p-2">FINISH</button>
      </header>

      <section className="flex flex-col gap-4">
        <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider">Logging Pillars</h3>
        {session.pillarsPerformed.map(pEntry => {
          const pInfo = pillarsData[pEntry.pillarId];
          return (
            <div key={pEntry.pillarId} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg">{pEntry.name}</h4>
                  <div className="flex gap-2 items-center mt-1">
                    {pEntry.counted ? (
                      <span className="text-[10px] flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-0.5 rounded font-bold border border-green-500/20">
                        <CheckCircle2 size={10} /> COUNTED
                      </span>
                    ) : (
                      <span className="text-[10px] flex items-center gap-1 bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded font-bold">
                        DNP (Min: {pInfo?.minWorkingWeight}lb)
                      </span>
                    )}
                    {pEntry.isPR && (
                      <span className="text-[10px] flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded font-bold border border-yellow-500/20">
                        <TrendingUp size={10} /> PR
                      </span>
                    )}
                    {pEntry.warning && (
                      <span className="text-[10px] flex items-center gap-1 bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold border border-red-500/20">
                        <AlertCircle size={10} /> LOW WEIGHT
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase">Current PR</p>
                  <p className="font-bold text-gray-300">{pInfo?.prWeight || 0}lb</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 mt-2">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-4xl font-black text-white tabular-nums">{pEntry.weight}</span>
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">LBS</span>
                </div>
                
                <div className="flex flex-col gap-2 flex-1">
                   <div className="flex gap-2">
                    <button 
                      onClick={() => updateWeight(pEntry.pillarId, -5)}
                      className="flex-1 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-700 active:scale-95 font-bold"
                    >
                      -5
                    </button>
                    <button 
                      onClick={() => updateWeight(pEntry.pillarId, 5)}
                      className="flex-1 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-white hover:bg-gray-700 active:scale-95 font-bold"
                    >
                      +5
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateWeight(pEntry.pillarId, -45)}
                      className="flex-1 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-700 active:scale-95 font-bold"
                    >
                      -45
                    </button>
                    <button 
                      onClick={() => updateWeight(pEntry.pillarId, 45)}
                      className="flex-1 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-white hover:bg-gray-700 active:scale-95 font-bold"
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

      <section className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-1">
            <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider">Accessory Suggestions</h3>
            {needsMore && <span className="text-[10px] text-yellow-500 font-bold uppercase animate-pulse">ADD {targetExercises - totalExercises} MORE</span>}
          </div>
          {(() => {
            const linkedIds = Array.from(new Set(
              session.pillarsPerformed.flatMap(p => pillarsData[p.pillarId]?.preferredAccessoryIds || [])
            ));
            if (linkedIds.length === 0) return null;
            return (
              <button 
                onClick={() => setShowAll(!showAll)}
                className="text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded border border-gray-800 text-gray-500"
              >
                {showAll ? 'Show Recommended' : 'Show All'}
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
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${
                    isDone 
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' 
                    : 'bg-gray-900 border-gray-800 text-gray-400'
                  }`}
                >
                  {isDone ? <Check size={14} /> : <Plus size={14} />}
                  {acc.name}
                </button>
              );
            });
          })()}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider">Session Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <label className="text-[10px] text-gray-500 uppercase font-bold">Minutes</label>
            <input 
              type="number" 
              placeholder="Duration" 
              className="bg-transparent w-full text-lg font-bold outline-none" 
              value={session.durationMinutes || ''}
              onChange={e => setSession({...session, durationMinutes: parseInt(e.target.value) || 0})}
            />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <label className="text-[10px] text-gray-500 uppercase font-bold">Calories</label>
            <input 
              type="number" 
              placeholder="Est. Burn" 
              className="bg-transparent w-full text-lg font-bold outline-none"
              value={session.calories || ''}
              onChange={e => setSession({...session, calories: parseInt(e.target.value) || 0})}
            />
          </div>
        </div>
        <textarea 
          placeholder="Session notes (optional)..." 
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm outline-none h-24"
          value={session.notes || ''}
          onChange={e => setSession({...session, notes: e.target.value})}
        ></textarea>
      </section>

      <button
        onClick={handleFinish}
        className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 mt-4 shadow-xl shadow-blue-900/40"
      >
        FINISH & SAVE SESSION
      </button>
    </div>
  );
};

export default ActiveSession;
