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
    
    let initialSelection = sorted.slice(0, numPillars);

    // If we have a preselected pillar, ensure it is in the selection
    if (preselectedPillar) {
      if (!initialSelection.find(p => p.id === preselectedPillar.id)) {
        // Replace the last recommended one with the preselected one
        // or just add it if we have space (but usually numPillars is the cap)
        initialSelection = [preselectedPillar, ...initialSelection.slice(0, numPillars - 1)];
      }
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
      <header className="flex items-center justify-between">
        <button onClick={onCancel} className="text-gray-400 p-2"><X /></button>
        <h2 className="text-xl font-bold">Setup Session</h2>
        <div className="w-10" />
      </header>

      <section>
        <h3 className="text-gray-400 font-semibold text-xs uppercase mb-3 tracking-wider">Workout Date</h3>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between focus-within:border-blue-500 transition-colors">
          <input 
            type="date" 
            className="bg-transparent text-gray-100 font-bold outline-none w-full"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
          />
          <Calendar size={18} className="text-blue-500" />
        </div>
      </section>

      <section>
        <h3 className="text-gray-400 font-semibold text-xs uppercase mb-3 tracking-wider">Muscle Focus</h3>
        <div className="flex flex-wrap gap-2">
          {muscleGroups.map(mg => (
            <button
              key={mg}
              onClick={() => setSelectedFocus(selectedFocus === mg ? null : mg)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedFocus === mg ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-700'}`}
            >
              {mg}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-gray-400 font-semibold text-xs uppercase mb-3 tracking-wider">Target Pillars</h3>
        <div className="flex gap-4">
          {[1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => setNumPillars(n)}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${numPillars === n ? 'bg-blue-600 text-white border-2 border-blue-400 shadow-lg shadow-blue-900/40' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-700'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="flex-grow">
        <h3 className="text-gray-400 font-semibold text-xs uppercase mb-3 tracking-wider">Rotation List</h3>
        <div className="flex flex-col gap-2">
          {allPillars.map(p => {
            const isSelected = !!recommendations.find(r => r.id === p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePillarSelection(p)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isSelected ? 'bg-blue-600/10 border-blue-500/50' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-700'}`}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div className="text-left">
                    <p className={`font-bold ${isSelected ? 'text-blue-100' : 'text-gray-300'}`}>{p.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">{p.muscleGroup}</p>
                  </div>
                </div>
                {isSelected && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-lg font-black tracking-widest">ACTIVE</span>}
              </button>
            );
          })}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
        <div className="max-w-lg mx-auto flex flex-col gap-3">
          <button
            disabled={recommendations.length === 0}
            onClick={() => onStart(recommendations, new Date(customDate).getTime())}
            className="w-full bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-blue-900/40 active:scale-[0.98] transition-all"
          >
            {recommendations.length > 0 ? 'START WORKOUT' : 'SELECT EXERCISES'} <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupWorkout;