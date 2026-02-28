import React, { useEffect, useState } from 'react';
import { repository } from '../services/repository';
import { Pillar, MuscleGroup } from '../types';
import { getRecommendedPillars } from '../services/recommendations';
import { ChevronRight, X, Calendar } from 'lucide-react';

interface SetupWorkoutProps {
  onCancel: () => void;
  onStart: (pillars: Pillar[], date?: number) => void;
  selectedFocus: string | null;
  setSelectedFocus: (f: string | null) => void;
  numPillars: number;
  setNumPillars: (n: number) => void;
  preselectedPillar?: Pillar | null;
}

const SetupWorkout: React.FC<SetupWorkoutProps> = ({ 
  onCancel, onStart, selectedFocus, setSelectedFocus, numPillars, setNumPillars, preselectedPillar
}) => {
  const [allPillars, setAllPillars] = useState<Pillar[]>([]);
  const [recommendations, setRecommendations] = useState<Pillar[]>([]);
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  const muscleGroups: MuscleGroup[] = ['Legs', 'Push', 'Pull', 'Core', 'Full Body', 'Conditioning'];

  useEffect(() => {
    repository.getActivePillars().then(setAllPillars);
  }, []);

  useEffect(() => {
    if (allPillars.length === 0) return;
    const now = Date.now();
    let sorted = getRecommendedPillars(allPillars, selectedFocus, now);
    
    let initialSelection: Pillar[];

    // If we have a preselected pillar, it should be the EXCLUSIVE initial selection
    if (preselectedPillar) {
      initialSelection = [preselectedPillar];
    } else {
      initialSelection = sorted.slice(0, numPillars);
    }

    setRecommendations(initialSelection);
  }, [allPillars, selectedFocus, numPillars, preselectedPillar]);

  const togglePillarSelection = (p: Pillar) => {
    if (recommendations.find(r => r.id === p.id)) {
      setRecommendations(recommendations.filter(r => r.id !== p.id));
    } else {
      setRecommendations([...recommendations, p]);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-6 pb-40">
      <header className="flex items-center justify-between pt-1">
        <button onClick={onCancel} className="text-gray-600 p-2"><X size={20} /></button>
        <h2 className="font-display text-xl font-black uppercase tracking-widest text-white">Setup Session</h2>
        <div className="w-10" />
      </header>

      <section>
        <h3 className="font-display text-[10px] text-gray-600 uppercase tracking-[0.25em] mb-3">Workout Date</h3>
        <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-4 flex items-center justify-between focus-within:border-orange-500/50 transition-colors">
          <input
            type="date"
            className="bg-transparent font-display font-bold text-gray-100 outline-none w-full"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
          />
          <Calendar size={16} className="text-gray-600" />
        </div>
      </section>

      <section>
        <h3 className="font-display text-[10px] text-gray-600 uppercase tracking-[0.25em] mb-3">Muscle Focus</h3>
        <div className="flex flex-wrap gap-2">
          {muscleGroups.map(mg => (
            <button
              key={mg}
              onClick={() => setSelectedFocus(selectedFocus === mg ? null : mg)}
              className={`px-4 py-2 rounded-lg font-display font-bold text-sm uppercase tracking-wide transition-all ${
                selectedFocus === mg
                  ? 'bg-orange-500 text-black'
                  : 'bg-gray-900/70 border border-gray-800 text-gray-500 hover:border-gray-700'
              }`}
            >
              {mg}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-display text-[10px] text-gray-600 uppercase tracking-[0.25em] mb-3">Target Pillars</h3>
        <div className="flex gap-3">
          {[1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => setNumPillars(n)}
              className={`flex-1 py-3 rounded-xl font-display font-black text-xl transition-all ${
                numPillars === n
                  ? 'bg-orange-500 text-black'
                  : 'bg-gray-900/70 border border-gray-800 text-gray-500 hover:border-gray-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="flex-grow">
        <h3 className="font-display text-[10px] text-gray-600 uppercase tracking-[0.25em] mb-3">Rotation List</h3>
        <div className="flex flex-col gap-2">
          {allPillars.map(p => {
            const isSelected = !!recommendations.find(r => r.id === p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePillarSelection(p)}
                className={`relative flex items-center justify-between p-4 rounded-xl border transition-all overflow-hidden ${
                  isSelected
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-gray-900/70 border-gray-800 hover:border-gray-700'
                }`}
              >
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-orange-500" />}
                <div className="flex items-center gap-3 pl-1">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-700'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-black rounded-sm" />}
                  </div>
                  <div className="text-left">
                    <p className={`font-display font-semibold text-base uppercase tracking-wider ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                      {p.name}
                    </p>
                    <p className="font-display text-[9px] text-gray-600 uppercase tracking-widest">{p.muscleGroup}</p>
                  </div>
                </div>
                {isSelected && (
                  <span className="font-display text-[9px] text-orange-500 font-black tracking-[0.2em] uppercase">ACTIVE</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            disabled={recommendations.length === 0}
            onClick={() => onStart(recommendations, new Date(customDate).getTime())}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-800 disabled:text-gray-700 text-black font-display font-black py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all uppercase tracking-widest text-lg"
          >
            {recommendations.length > 0 ? 'START WORKOUT' : 'SELECT EXERCISES'} <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupWorkout;