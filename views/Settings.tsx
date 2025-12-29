
import React, { useEffect, useState } from 'react';
import { db, initOnce } from '../db';
import { Pillar, AppConfig, ExportPayload } from '../types';
import { Download, Upload, Trash2, Edit2, ShieldCheck, Database, Info, Wrench } from 'lucide-react';

const APP_VERSION = "2.1.0";

const Settings: React.FC = () => {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [editingPillar, setEditingPillar] = useState<string | null>(null);
  const [stats, setStats] = useState({ sessions: 0, pillars: 0, accessories: 0 });
  const [storageInfo, setStorageInfo] = useState({ persisted: false, usageMB: '0' });

  useEffect(() => {
    loadData();
    updateStorageStatus();
  }, []);

  const updateStorageStatus = async () => {
    if (navigator.storage) {
      const persisted = await navigator.storage.persisted();
      const estimate = await navigator.storage.estimate();
      const usageMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
      setStorageInfo({ persisted, usageMB });
    }
  };

  const loadData = async () => {
    const p = await db.pillars.toArray();
    const c = await db.config.get('main');
    const sCount = await db.sessions.count();
    const aCount = await db.accessories.count();
    setPillars(p);
    setConfig(c || null);
    setStats({ sessions: sCount, pillars: p.length, accessories: aCount });
  };

  const updateConfig = async (updates: Partial<AppConfig>) => {
    if (!config) return;
    const newConfig = { ...config, ...updates };
    await db.config.put(newConfig);
    setConfig(newConfig);
  };

  const updatePillar = async (pillar: Pillar) => {
    await db.pillars.put(pillar);
    setEditingPillar(null);
    loadData();
  };

  const exportData = async () => {
    const pillars = await db.pillars.toArray();
    const sessions = await db.sessions.toArray();
    const accessories = await db.accessories.toArray();
    const config = await db.config.get('main');
    
    if (!config) return;

    const payload: ExportPayload = {
      exportVersion: 2,
      appVersion: APP_VERSION,
      appDataVersion: config.appDataVersion || 0,
      exportedAt: new Date().toISOString(),
      deviceId: config.deviceId || 'unknown',
      data: {
        pillars,
        sessions,
        accessories,
        config
      }
    };
    
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-buddy-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    
    await db.config.update('main', { lastExportAt: Date.now() });
    loadData();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string);
        if (!payload.exportVersion || !payload.data) {
          throw new Error('Invalid backup format');
        }

        if (!confirm('OVERWRITE ALL LOCAL DATA? This cannot be undone.')) return;

        await db.transaction('rw', [db.pillars, db.sessions, db.accessories, db.config], async () => {
          const { pillars, sessions, accessories, config: importedConfig } = payload.data;
          
          await db.pillars.clear();
          await db.pillars.bulkPut(pillars);
          
          await db.sessions.clear();
          await db.sessions.bulkPut(sessions);
          
          await db.accessories.clear();
          await db.accessories.bulkPut(accessories);
          
          if (importedConfig) {
             await db.config.put({
               ...importedConfig,
               id: 'main' // Ensure constant ID
             });
          }
        });

        alert('Import successful! App will reload.');
        window.location.reload();
      } catch (err) {
        alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    reader.readAsText(file);
  };

  const runRepair = async () => {
    if (!confirm('Run database integrity check and repair?')) return;
    await initOnce();
    alert('Repair complete. Missing canonical items re-added.');
    loadData();
  };

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 text-sm">System configuration and data integrity.</p>
      </header>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="text-gray-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
          <Database size={14} /> Storage Status
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 p-3 rounded-xl border border-gray-800">
            <p className="text-[10px] text-gray-600 uppercase font-bold">Protection</p>
            <div className="flex items-center gap-2 mt-1">
              <ShieldCheck size={16} className={storageInfo.persisted ? "text-green-500" : "text-gray-600"} />
              <span className="text-sm font-bold">{storageInfo.persisted ? 'Persistent' : 'Best Effort'}</span>
            </div>
          </div>
          <div className="bg-black/20 p-3 rounded-xl border border-gray-800">
            <p className="text-[10px] text-gray-600 uppercase font-bold">Usage</p>
            <p className="text-sm font-bold mt-1">{storageInfo.usageMB} MB</p>
          </div>
        </div>
        {!storageInfo.persisted && (
          <div className="flex gap-2 text-[10px] text-yellow-500 bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10">
            <Info size={14} className="shrink-0" />
            <p>On mobile browsers, data may be reclaimed if your phone runs low on space. Exporting backups is your only safety net.</p>
          </div>
        )}
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="text-gray-400 font-bold uppercase text-xs tracking-widest">Preferences</h3>
        <div className="flex items-center justify-between">
          <label className="text-sm">Target Exercises / Session</label>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => updateConfig({ targetExercisesPerSession: Math.max(1, (config?.targetExercisesPerSession || 4) - 1) })}
              className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-gray-400 active:scale-90 transition-transform"
            >
              -
            </button>
            <span className="font-bold w-4 text-center">{config?.targetExercisesPerSession}</span>
            <button 
              onClick={() => updateConfig({ targetExercisesPerSession: (config?.targetExercisesPerSession || 4) + 1 })}
              className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-gray-400 active:scale-90 transition-transform"
            >
              +
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-gray-400 font-bold uppercase text-xs tracking-widest">Pillar Catalog</h3>
        <div className="flex flex-col gap-3">
          {pillars.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-bold">{p.name}</h4>
                  <p className="text-[10px] text-gray-500 uppercase">{p.muscleGroup} • {p.cadenceDays} Day Cycle</p>
                </div>
                <button 
                  onClick={() => setEditingPillar(editingPillar === p.id ? null : p.id)}
                  className="p-2 text-gray-400 active:text-white"
                >
                  <Edit2 size={16} />
                </button>
              </div>
              
              {editingPillar === p.id && (
                <div className="p-4 border-t border-gray-800 bg-gray-800/30 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Cadence</label>
                    <input 
                      type="number" 
                      className="bg-gray-900 border border-gray-700 rounded p-2 text-sm outline-none focus:border-blue-500"
                      value={p.cadenceDays}
                      onChange={e => updatePillar({...p, cadenceDays: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Min Working Weight</label>
                    <input 
                      type="number" 
                      className="bg-gray-900 border border-gray-700 rounded p-2 text-sm outline-none focus:border-blue-500"
                      value={p.minWorkingWeight}
                      onChange={e => updatePillar({...p, minWorkingWeight: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-gray-400 font-bold uppercase text-xs tracking-widest">Backup & Utility</h3>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={exportData}
            className="bg-gray-800 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border border-gray-700 active:bg-gray-700"
          >
            <Download size={16} /> Export
          </button>
          <label className="bg-gray-800 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border border-gray-700 cursor-pointer text-center active:bg-gray-700">
            <Upload size={16} /> Import
            <input type="file" className="hidden" accept=".json" onChange={importData} />
          </label>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={runRepair}
            className="w-full text-blue-400/80 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold border border-blue-500/10 active:border-blue-500/30"
          >
            <Wrench size={14} /> Repair DB
          </button>
          <button 
            onClick={async () => {
              if(confirm('Wipe everything? This action cannot be undone.')) {
                await db.delete();
                window.location.reload();
              }
            }}
            className="w-full text-red-500/60 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold border border-red-500/10 active:border-red-500/30"
          >
            <Trash2 size={14} /> Factory Reset
          </button>
        </div>
      </section>

      <div className="py-8 text-center text-gray-700 text-[10px] uppercase font-bold tracking-widest">
        Workout Buddy v{APP_VERSION} • {stats.sessions} Sessions
      </div>
    </div>
  );
};

export default Settings;
