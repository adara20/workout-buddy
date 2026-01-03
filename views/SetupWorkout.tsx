
import React, { useEffect, useState } from 'react';
import { repository } from '../services/repository';
import { Pillar, MuscleGroup } from '../types';
import { getRecommendedPillars } from '../services/recommendations';
import { ChevronRight, X, Shuffle } from 'lucide-react';

interface SetupWorkoutProps {
  onCancel: () => void;
  onStart: (pillars: Pillar[]) => void;
  selectedFocus: string | null;
  setSelectedFocus: (f: string | null) => void;
  numPillars: number;
  setNumPillars: (n: number) => void;
}

const SetupWorkout: React.FC<SetupWorkoutProps> = ({ 
  onCancel, onStart, selectedFocus, setSelectedFocus, numPillars, setNumPillars 
}) => {
  const [allPillars, setAllPillars] = useState<Pillar[]>([]);
  const [recommendations, setRecommendations] = useState<Pillar[]>([]);

  const muscleGroups: MuscleGroup[] = ['Legs', 'Push', 'Pull', 'Core', 'Full Body', 'Conditioning'];

  useEffect(() => {
    repository.getActivePillars().then(setAllPillars);
  }, []);

  useEffect(() => {
    if (allPillars.length === 0) return;
    const now = Date.now();
    const sorted = getRecommendedPillars(allPillars, selectedFocus, now);
    setRecommendations(sorted.slice(0, numPillars));
  }, [allPillars, selectedFocus, numPillars]);

  const togglePillarSelection = (p: Pillar) => {
    if (recommendations.find(r => r.id === p.id)) {
      setRecommendations(recommendations.filter(r => r.id !== p.id));
    } else if (recommendations.length < 3) {
      setRecommendations([...recommendations, p]);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <button onClick={onCancel} className="text-gray-400 p-2"><X /></button>
        <h2 className="text-xl font-bold">Setup Session</h2>
        <div className="w-10" />
      </header>

      <section>
        <h3 className="text-gray-400 font-semibold text-xs uppercase mb-3">Muscle Focus</h3>
        <div className="flex flex-wrap gap-2">
          {muscleGroups.map(mg => (
            <button
              key={mg}
              onClick={() => setSelectedFocus(selectedFocus === mg ? null : mg)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedFocus === mg ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              {mg}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-gray-400 font-semibold text-xs uppercase mb-3">Target Pillars</h3>
        <div className="flex gap-4">
          {[1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => setNumPillars(n)}
              className={`flex-1 py-3 rounded-xl font-bold transition-colors ${numPillars === n ? 'bg-blue-600 text-white border-2 border-blue-400' : 'bg-gray-800 text-gray-400 border-2 border-transparent'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="flex-grow">
        <h3 className="text-gray-400 font-semibold text-xs uppercase mb-3">Recommended Rotation</h3>
        <div className="flex flex-col gap-2">
          {allPillars.map(p => {
            const isSelected = !!recommendations.find(r => r.id === p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePillarSelection(p)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isSelected ? 'bg-gray-800 border-blue-500 scale-[1.02]' : 'bg-gray-900 border-gray-800'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div className="text-left">
                    <p className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{p.name}</p>
                    <p className="text-[10px] text-gray-500">{p.muscleGroup}</p>
                  </div>
                </div>
                {isSelected && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold">SELECTED</span>}
              </button>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-4 flex flex-col gap-3">
        <button
          onClick={() => onStart([])}
          className="flex items-center justify-center gap-2 text-gray-400 hover:text-white py-2 transition-colors text-sm font-semibold"
        >
          <Shuffle size={16} /> Random Untracked Day
        </button>
        <button
          disabled={recommendations.length === 0}
          onClick={() => onStart(recommendations)}
          className="w-full bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-900/40"
        >
          {recommendations.length > 0 ? 'START SESSION' : 'SELECT PILLARS'} <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default SetupWorkout;
