
import React from 'react';
import { WorkoutSession } from '../types';
import { Trophy, CheckCircle2, Star, ArrowRight } from 'lucide-react';

interface SummaryProps {
  session: WorkoutSession;
  onDone: () => void;
}

const Summary: React.FC<SummaryProps> = ({ session, onDone }) => {
  const prs = session.pillarsPerformed.filter(p => p.isPR);
  const counted = session.pillarsPerformed.filter(p => p.counted);

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col items-center gap-6 min-h-screen justify-center text-center">
      {/* Hero */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto border border-orange-500/30">
            <Trophy className="text-orange-500" size={40} />
          </div>
          {prs.length > 0 && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-black font-display font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider animate-bounce">
              {prs.length} NEW PR{prs.length > 1 ? 'S' : ''}!
            </div>
          )}
        </div>
        <div>
          <h1 className="font-display text-5xl font-black uppercase tracking-tight text-white leading-none">
            Workout Complete!
          </h1>
          <p className="font-display text-sm text-gray-600 uppercase tracking-widest mt-2">Rotation updated</p>
        </div>
      </div>

      {/* Stats */}
      <div className="w-full grid grid-cols-2 gap-3">
        <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-5 flex flex-col items-start">
          <span className="font-display text-5xl font-black text-white leading-none">{counted.length}</span>
          <span className="font-display text-[9px] text-gray-600 uppercase tracking-widest mt-1">Pillars Counted</span>
        </div>
        <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-5 flex flex-col items-start">
          <span className="font-display text-5xl font-black text-white leading-none">{session.accessoriesPerformed.length}</span>
          <span className="font-display text-[9px] text-gray-600 uppercase tracking-widest mt-1">Accessories</span>
        </div>
      </div>

      {/* PRs */}
      {prs.length > 0 && (
        <section className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <h3 className="font-display text-yellow-500 font-black uppercase text-xs tracking-widest flex items-center gap-2 mb-3">
            <Star size={12} fill="currentColor" /> New Personal Records
          </h3>
          <div className="flex flex-col gap-2">
            {prs.map(p => (
              <div key={p.pillarId} className="flex justify-between items-center bg-gray-800/40 p-3 rounded-lg">
                <span className="font-display font-semibold text-base uppercase tracking-wider">{p.name}</span>
                <span className="font-display text-yellow-500 font-bold text-lg">{p.weight} lb</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rotation impacts */}
      <section className="w-full text-left">
        <h3 className="font-display text-[10px] text-gray-600 uppercase tracking-[0.25em] mb-2 px-1">Rotation Impacts</h3>
        <div className="bg-gray-900/70 border border-gray-800 rounded-xl overflow-hidden">
          {session.pillarsPerformed.map(p => (
            <div key={p.pillarId} className="px-4 py-3 border-b border-gray-800/60 flex justify-between items-center last:border-0">
              <div>
                <p className="font-display font-semibold text-base uppercase tracking-wider">{p.name}</p>
                <p className={`font-display text-[10px] font-bold uppercase tracking-wider ${p.counted ? 'text-green-500' : 'text-gray-700'}`}>
                  {p.counted ? 'Rotation Reset' : 'Skipped — Under Min Weight'}
                </p>
              </div>
              <p className="font-display font-bold text-lg">{p.weight} lb</p>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={onDone}
        className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-black font-display font-black py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest text-lg transition-colors"
      >
        BACK TO DASHBOARD <ArrowRight size={20} />
      </button>
    </div>
  );
};

export default Summary;
