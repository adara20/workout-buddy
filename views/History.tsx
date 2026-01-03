
import React, { useEffect, useState } from 'react';
import { repository } from '../services/repository';
import { WorkoutSession } from '../types';
import { Calendar, Trash2, Edit2 } from 'lucide-react';

const History: React.FC = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [editingSession, setEditingSession] = useState<string | null>(null);

  const loadSessions = () => {
    repository.getAllSessions().then(setSessions);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this workout session permanently? This will also update your PR stats.')) {
      await repository.deleteSession(id);
      loadSessions();
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    await repository.updateSession(id, { notes });
    setEditingSession(null);
    loadSessions();
  };

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
            <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-gray-100">
                    {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(s.pillarsPerformed || []).map(p => (
                      <span key={p.pillarId} className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
                        {p.name}
                      </span>
                    ))}
                    {(s.accessoriesPerformed || []).map(a => (
                      <span key={a.accessoryId} className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setEditingSession(editingSession === s.id ? null : s.id)}
                    className="p-2 text-gray-500 hover:text-blue-400 active:scale-90 transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => s.id && handleDelete(s.id)}
                    className="p-2 text-gray-500 hover:text-red-400 active:scale-90 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {(s.notes || editingSession === s.id) && (
                <div className="bg-black/20 rounded-xl p-3 border border-gray-800/50">
                  {editingSession === s.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-xs text-gray-200 focus:border-blue-500 outline-none min-h-[60px]"
                        defaultValue={s.notes || ''}
                        autoFocus
                        onBlur={(e) => handleUpdateNotes(s.id!, e.target.value)}
                        placeholder="Add notes..."
                      />
                      <p className="text-[9px] text-gray-600">Changes are saved automatically on blur.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">"{s.notes}"</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default History;
