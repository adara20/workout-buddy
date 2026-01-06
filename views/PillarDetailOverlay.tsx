import React, { useEffect, useState } from 'react';
import { Pillar, Accessory } from '../types';
import { repository } from '../services/repository';
import { X, Trophy, Target, Dumbbell, Play } from 'lucide-react';

interface PillarDetailOverlayProps {
  pillar: Pillar;
  onClose: () => void;
  onStartWorkout: (pillar: Pillar) => void;
}

const PillarDetailOverlay: React.FC<PillarDetailOverlayProps> = ({ pillar, onClose, onStartWorkout }) => {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccessories = async () => {
      setLoading(true);
      try {
        const all = await repository.getAllAccessories();
        const filtered = all.filter(acc => (pillar.preferredAccessoryIds || []).includes(acc.id));
        setAccessories(filtered);
      } catch (err) {
        console.error('Failed to fetch accessories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAccessories();
  }, [pillar]);

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
              <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-2">{pillar.name}</h2>
              <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-blue-500/20">
                {pillar.muscleGroup}
              </span>
            </div>
            <button 
              onClick={onClose}
              className="bg-gray-800 text-gray-400 p-2 rounded-full hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-950/50 border border-gray-800 p-4 rounded-2xl flex flex-col gap-1">
              <div className="flex items-center gap-2 text-yellow-500 mb-1">
                <Trophy size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Personal Record</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{pillar.prWeight}</span>
                <span className="text-xs text-gray-500 font-bold">lb</span>
              </div>
            </div>

            <div className="bg-gray-950/50 border border-gray-800 p-4 rounded-2xl flex flex-col gap-1">
              <div className="flex items-center gap-2 text-blue-500 mb-1">
                <Target size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Working Weight</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{pillar.minWorkingWeight}</span>
                <span className="text-xs text-gray-500 font-bold">lb</span>
              </div>
            </div>
          </div>

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
              onClick={() => onStartWorkout(pillar)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-900/40 active:scale-[0.98] transition-all"
            >
              <Play size={20} fill="currentColor" />
              START SESSION
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default PillarDetailOverlay;
