
import React, { useEffect, useState } from 'react';
import { repository } from '../services/repository';
import { WorkoutSession } from '../types';
import { Calendar, Trash2, Edit2, Check } from 'lucide-react';

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
    loadSessions();
  };

  const handleUpdateDate = async (id: string, dateStr: string) => {
    const date = new Date(dateStr).getTime();
    if (isNaN(date)) return;
    await repository.updateSession(id, { date });
    loadSessions();
  };

  const handleUpdateWeight = async (sessionId: string, pillarId: string, weight: number) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const updatedPillars = session.pillarsPerformed.map(p => 
      p.pillarId === pillarId ? { ...p, weight } : p
    );

    await repository.updateSession(sessionId, { pillarsPerformed: updatedPillars });
    loadSessions();
  };

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-5">
      <header className="pt-1">
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white">Workout History</h1>
        <p className="font-display text-[10px] text-gray-600 uppercase tracking-widest mt-0.5">{sessions.length} sessions logged</p>
      </header>

      <div className="flex flex-col gap-2">
        {sessions.length === 0 ? (
          <div className="bg-gray-900/70 border border-dashed border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center gap-3">
            <Calendar size={36} className="text-gray-800" />
            <p className="font-display text-gray-600 text-sm">No workouts logged yet. Start your first session!</p>
          </div>
        ) : (
          sessions.map(s => (
            <div key={s.id} className="bg-gray-900/70 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  {editingSession === s.id ? (
                    <input
                      type="date"
                      className="bg-gray-950 border border-gray-700 rounded-lg p-2 font-display font-bold text-sm text-white outline-none focus:border-orange-500/50 w-fit"
                      defaultValue={new Date(s.date).toISOString().split('T')[0]}
                      onBlur={(e) => handleUpdateDate(s.id!, e.target.value)}
                    />
                  ) : (
                    <p className="font-display text-lg font-black uppercase tracking-wide text-gray-100">
                      {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {(s.pillarsPerformed || []).map(p => (
                      <div key={p.pillarId} className="flex items-center bg-gray-800 rounded-lg border border-gray-700/60 overflow-hidden">
                        <span className="font-display text-[10px] text-gray-400 uppercase tracking-wide px-2 py-1 border-r border-gray-700/60">{p.name}</span>
                        {editingSession === s.id ? (
                          <input
                            type="number"
                            className="bg-black/40 font-display text-[10px] text-orange-400 font-bold w-10 px-1 outline-none text-center"
                            defaultValue={p.weight}
                            onBlur={(e) => handleUpdateWeight(s.id!, p.pillarId, parseInt(e.target.value) || 0)}
                          />
                        ) : (
                          <span className="font-display text-[10px] text-orange-400 font-bold px-2">{p.weight}lb</span>
                        )}
                      </div>
                    ))}
                    {(s.accessoriesPerformed || []).map(a => (
                      <span key={a.accessoryId} className="font-display text-[10px] bg-gray-800 text-gray-500 px-2 py-1 rounded-lg border border-gray-700/60 uppercase tracking-wide">
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingSession(editingSession === s.id ? null : s.id!)}
                    className={`p-2 transition-all rounded-lg ${editingSession === s.id ? 'bg-orange-500 text-black' : 'text-gray-600 hover:text-gray-400 active:scale-90'}`}
                  >
                    {editingSession === s.id ? <Check size={15} /> : <Edit2 size={15} />}
                  </button>
                  <button
                    onClick={() => s.id && handleDelete(s.id)}
                    className="p-2 text-gray-700 hover:text-red-500 active:scale-90 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {(s.notes || editingSession === s.id) && (
                <div className="bg-black/20 rounded-lg p-3 border border-gray-800/50">
                  {editingSession === s.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        className="bg-gray-950 border border-gray-700 rounded-lg p-2 font-display text-sm text-gray-200 focus:border-orange-500/50 outline-none min-h-[60px] resize-none"
                        defaultValue={s.notes || ''}
                        autoFocus
                        onBlur={(e) => handleUpdateNotes(s.id!, e.target.value)}
                        placeholder="Add notes..."
                      />
                      <p className="font-display text-[9px] text-gray-700 uppercase tracking-wider">Auto-saves on blur</p>
                    </div>
                  ) : (
                    <p className="font-display text-sm text-gray-500 italic">"{s.notes}"</p>
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
