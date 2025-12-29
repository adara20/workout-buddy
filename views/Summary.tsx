
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
    <div className="p-4 max-w-lg mx-auto flex flex-col items-center gap-8 min-h-screen justify-center text-center">
      <div className="space-y-4">
        <div className="relative">
          <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-yellow-500/40">
            <Trophy className="text-yellow-500" size={48} />
          </div>
          {prs.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce">
              {prs.length} NEW PR{prs.length > 1 ? 'S' : ''}!
            </div>
          )}
        </div>
        <h1 className="text-3xl font-black text-white">Workout Complete!</h1>
        <p className="text-gray-400">Great job staying consistent. Your rotation is updated.</p>
      </div>

      <div className="w-full grid grid-cols-2 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col items-center">
          <span className="text-3xl font-black text-white">{counted.length}</span>
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Pillars Counted</span>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col items-center">
          <span className="text-3xl font-black text-white">{session.accessoriesPerformed.length}</span>
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Accessories</span>
        </div>
      </div>

      {prs.length > 0 && (
        <section className="w-full bg-gray-900/50 border border-yellow-500/20 rounded-2xl p-6">
          <h3 className="text-yellow-500 font-bold uppercase text-xs flex items-center justify-center gap-2 mb-4">
            <Star size={14} fill="currentColor" /> Personal Records Broken
          </h3>
          <div className="space-y-3">
            {prs.map(p => (
              <div key={p.pillarId} className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg">
                <span className="font-bold">{p.name}</span>
                <span className="text-yellow-500 font-black">{p.weight} lb</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="w-full text-left">
        <h3 className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-3 px-2">Rotation Impacts</h3>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {session.pillarsPerformed.map(p => (
            <div key={p.pillarId} className="p-4 border-b border-gray-800 flex justify-between items-center last:border-0">
               <div>
                <p className="font-semibold">{p.name}</p>
                <p className={`text-[10px] font-bold ${p.counted ? 'text-green-500' : 'text-gray-600 uppercase'}`}>
                  {p.counted ? '✓ ROTATION RESET' : 'SKIPPED (UNDER MIN WEIGHT)'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black">{p.weight} lb</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={onDone}
        className="w-full bg-white text-gray-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-white/5"
      >
        BACK TO DASHBOARD <ArrowRight size={20} />
      </button>
    </div>
  );
};

export default Summary;
