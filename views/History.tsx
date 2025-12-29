
import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { WorkoutSession } from '../types';
import { Calendar, ChevronRight } from 'lucide-react';

const History: React.FC = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    db.sessions.orderBy('date').reverse().toArray().then(setSessions);
  }, []);

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Workout History</h1>
        <p className="text-gray-500 text-sm">{sessions.length} sessions logged</p>
      </header>

      <div className="flex flex-col gap-3">
        {sessions.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4">
             <Calendar size={48} className="text-gray-700" />
             <p className="text-gray-500">No workouts logged yet. Start your first session!</p>
          </div>
        ) : (
          sessions.map(s => (
            <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-gray-100">
                  {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <div className="flex flex-wrap gap-1">
                  {s.pillarsPerformed.map(p => (
                    <span key={p.pillarId} className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
                      {p.name}
                    </span>
                  ))}
                  {s.accessoriesPerformed.map(a => (
                    <span key={a.accessoryId} className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-700" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default History;
