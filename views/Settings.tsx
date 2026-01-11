import React, { useEffect, useState } from 'react';
import { repository } from '../services/repository';
import { initOnce } from '../db';
import { Pillar, Accessory, AppConfig, ExportPayload } from '../types';
import { 
  Download, Upload, Trash2, Edit2, ShieldCheck, Database, Info, 
  Wrench, Archive, RotateCcw, Plus, X, Check, Cloud, LogOut, 
  Mail, Lock, Loader2, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { User } from '@firebase/auth';
import { onAuthChange, signIn, signUp, signOut } from '../services/auth';
import { uploadToCloud, downloadFromCloud } from '../services/cloud-rest';

const APP_VERSION = "2.1.0";

const Settings: React.FC = () => {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [editingPillar, setEditingPillar] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Pillar> | null>(null);
  const [addingPillar, setAddingPillar] = useState(false);
  const [addingAccessory, setAddingAccessory] = useState(false);
  const [newExerciseError, setNewExerciseError] = useState<string | null>(null);
  const [stats, setStats] = useState({ sessions: 0, pillars: 0, accessories: 0 });
  const [storageInfo, setStorageInfo] = useState({ persisted: false, usageMB: '0' });

  // Auth & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    updateStorageStatus();
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      if (u) setShowAuthForm(false);
    });
    return () => unsubscribe();
  }, [showArchived]);

  const updateStorageStatus = async () => {
    if (navigator.storage) {
      const persisted = await navigator.storage.persisted();
      const estimate = await navigator.storage.estimate();
      const usageMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
      setStorageInfo({ persisted, usageMB });
    }
  };

  const loadData = async () => {
    const p = showArchived ? await repository.getAllPillars() : await repository.getActivePillars();
    const c = await repository.getConfig();
    const sCount = await repository.getSessionCount();
    const accs = await repository.getAllAccessories();
    setPillars(p);
    setAccessories(accs);
    setConfig(c || null);
    setStats({ sessions: sCount, pillars: p.length, accessories: accs.length });
  };

  const updateConfigState = async (updates: Partial<AppConfig>) => {
    if (!config) return;
    const newConfig = { ...config, ...updates };
    await repository.putConfig(newConfig);
    setConfig(newConfig);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncLoading(true);
    setSyncError(null);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!confirm('This will overwrite your existing cloud backup. Continue?')) return;
    setSyncLoading(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      await uploadToCloud();
      setSyncSuccess('Pushed to cloud successfully!');
      loadData(); // Refresh config for lastSyncedAt
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!confirm('OVERWRITE LOCAL DATA? This cannot be undone.')) return;
    setSyncLoading(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const restored = await downloadFromCloud();
      if (restored) {
        setSyncSuccess('Cloud data restored! Reloading...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncError('No cloud backup found.');
      }
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const exportData = async () => {
    const pillars = await repository.getAllPillars();
    const sessions = await repository.getAllSessions();
    const accessories = await repository.getAllAccessories();
    const config = await repository.getConfig();
    
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
    
    await repository.updateConfig({ lastExportAt: Date.now() });
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

        await repository.runTransaction('rw', ['pillars', 'workout_sessions', 'accessories', 'config'], async () => {
          const { pillars, sessions, accessories, config: importedConfig } = payload.data;
          
          await repository.clearPillars();
          await repository.bulkPutPillars(pillars);
          
          await repository.clearSessions();
          await repository.bulkPutSessions(sessions);
          
          await repository.clearAccessories();
          await repository.bulkPutAccessories(accessories);
          
          if (importedConfig) {
             await repository.putConfig({
               ...importedConfig,
               id: 'main'
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

  const startEditing = (p: Pillar) => {
    if (editingPillar === p.id) {
      cancelEdit();
    } else {
      setEditingPillar(p.id);
      setEditForm({ ...p });
    }
  };

  const cancelEdit = () => {
    setEditingPillar(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (editForm && editingPillar) {
      const original = pillars.find(p => p.id === editingPillar);
      if (original) {
        await repository.putPillar({ ...original, ...editForm });
        loadData();
      }
    }
    cancelEdit();
  };

  const updateEditForm = (updates: Partial<Pillar>) => {
    setEditForm(prev => prev ? { ...prev, ...updates } : updates);
  };

  const handleAddPillar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewExerciseError(null);
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const muscleGroup = formData.get('muscleGroup') as any;
    const cadenceDays = parseInt(formData.get('cadence') as string) || 7;
    const notes = (formData.get('notes') as string || '').trim();

    if (!name) return setNewExerciseError('Name is required');
    if (!(await repository.isPillarNameUnique(name))) return setNewExerciseError('Exercise already exists');

    await repository.createPillar({ name, muscleGroup, cadenceDays, notes });
    setAddingPillar(false);
    loadData();
  };

  const handleAddAccessory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewExerciseError(null);
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();

    if (!name) return setNewExerciseError('Name is required');
    if (!(await repository.isAccessoryNameUnique(name))) return setNewExerciseError('Accessory already exists');

    await repository.createAccessory(name);
    setAddingAccessory(false);
    loadData();
  };

  const toggleArchive = async (pillar: Pillar) => {
    if (pillar.isActive === false) {
      await repository.restorePillar(pillar.id);
    } else {
      if (confirm(`Archive ${pillar.name}? It will be hidden from Dashboard and Setup.`)) {
        await repository.archivePillar(pillar.id);
      } else {
        return;
      }
    }
    loadData();
  };

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm">System configuration and data integrity.</p>
      </header>

      {/* Cloud & Data Sync Section */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-gray-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
            <Cloud size={14} className="text-blue-500" /> Cloud & Data
          </h3>
          {user && (
            <button 
              onClick={() => signOut()}
              className="text-gray-500 hover:text-red-400 flex items-center gap-1.5 text-[10px] font-bold uppercase"
            >
              <LogOut size={12} /> Sign Out
            </button>
          )}
        </div>

        {!user ? (
          <div className="space-y-4">
            {!showAuthForm ? (
              <div className="bg-black/20 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-gray-300">Not Signed In</p>
                  <p className="text-[10px] text-gray-600 uppercase">Cloud sync is disabled</p>
                </div>
                <button 
                  onClick={() => setShowAuthForm(true)}
                  className="bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-lg uppercase"
                >
                  Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="bg-black/30 border border-gray-800 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2">
                <div className="space-y-1">
                  <label htmlFor="auth-email" className="text-[10px] text-gray-500 uppercase font-bold">Email</label>
                  <input 
                    id="auth-email"
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs focus:border-blue-500 outline-none text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="auth-password" className="text-[10px] text-gray-500 uppercase font-bold">Password</label>
                  <input 
                    id="auth-password"
                    type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs focus:border-blue-500 outline-none text-white"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button 
                    type="button" onClick={() => setShowAuthForm(false)}
                    className="flex-1 py-2 text-[10px] font-bold uppercase text-gray-500"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" disabled={syncLoading}
                    className="flex-2 bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-lg uppercase flex items-center justify-center gap-2"
                  >
                    {syncLoading ? <Loader2 size={12} className="animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
                  </button>
                </div>
                <button 
                  type="button" onClick={() => setIsLogin(!isLogin)}
                  className="w-full text-[10px] text-center text-gray-600 uppercase font-bold hover:text-blue-500"
                >
                  {isLogin ? "Need an account? Create one" : "Already have an account? Log In"}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl">
               <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-[10px] text-blue-400 font-bold uppercase">Cloud Connected</p>
                    <p className="text-xs font-bold text-gray-200">{user.email}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] text-gray-600 font-bold uppercase">Last Sync</p>
                    <p className="text-xs font-bold text-gray-400">
                      {config?.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </p>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-3 mt-4">
                  <button 
                    onClick={handleUpload} disabled={syncLoading}
                    className="bg-gray-800 border border-gray-700 hover:border-blue-500/50 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-colors"
                  >
                    {syncLoading ? <Loader2 size={14} className="animate-spin" /> : <><Upload size={14} className="text-blue-500" /> Push</>}
                  </button>
                  <button 
                    onClick={handleDownload} disabled={syncLoading}
                    className="bg-gray-800 border border-gray-700 hover:border-orange-500/50 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-colors"
                  >
                    {syncLoading ? <Loader2 size={14} className="animate-spin" /> : <><Download size={14} className="text-orange-500" /> Pull</>}
                  </button>
               </div>
            </div>
          </div>
        )}

        {(syncError || syncSuccess) && (
          <div className={`p-3 rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase ${syncError ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
            {syncError ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            <span className="truncate">{syncError || syncSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 border-t border-gray-800 pt-4">
          <button 
            onClick={exportData}
            className="bg-black/20 text-gray-400 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase border border-gray-800 active:bg-gray-800"
          >
            <Download size={14} /> Local JSON Export
          </button>
          <label className="bg-black/20 text-gray-400 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase border border-gray-800 cursor-pointer text-center active:bg-gray-800">
            <Upload size={14} /> JSON Import
            <input type="file" className="hidden" accept=".json" onChange={importData} />
          </label>
        </div>
      </section>

      {/* Existing Sections */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="text-gray-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
          <Database size={14} /> Storage Status
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 p-3 rounded-xl border border-gray-800">
            <p className="text-[10px] text-gray-600 uppercase font-bold">Protection</p>
            <div className="flex items-center gap-2 mt-1">
              <ShieldCheck size={16} className={storageInfo.persisted ? "text-green-500" : "text-gray-600"} />
              <span className="text-sm font-bold text-gray-200">{storageInfo.persisted ? 'Persistent' : 'Best Effort'}</span>
            </div>
          </div>
          <div className="bg-black/20 p-3 rounded-xl border border-gray-800">
            <p className="text-[10px] text-gray-600 uppercase font-bold">Usage</p>
            <p className="text-sm font-bold mt-1 text-gray-200">{storageInfo.usageMB} MB</p>
          </div>
        </div>
        {!storageInfo.persisted && (
          <div className="flex gap-2 text-[10px] text-yellow-500 bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10">
            <Info size={14} className="shrink-0" />
            <p>On mobile browsers, data may be reclaimed if your phone runs low on space. Backups are critical.</p>
          </div>
        )}
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="text-gray-400 font-bold uppercase text-xs tracking-widest">Preferences</h3>
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Target Exercises / Session</label>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => updateConfigState({ targetExercisesPerSession: Math.max(1, (config?.targetExercisesPerSession || 4) - 1) })}
              className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-gray-400 active:scale-90 transition-transform"
            >
              -
            </button>
            <span className="font-bold w-4 text-center text-white">{config?.targetExercisesPerSession}</span>
            <button 
              onClick={() => updateConfigState({ targetExercisesPerSession: (config?.targetExercisesPerSession || 4) + 1 })}
              className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-gray-400 active:scale-90 transition-transform"
            >
              +
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-1">
            <h3 className="text-gray-400 font-bold uppercase text-xs tracking-widest">Pillar Catalog</h3>
            <button 
              onClick={() => {
                setAddingPillar(!addingPillar);
                setNewExerciseError(null);
              }}
              className="flex items-center gap-1.5 text-blue-500 font-bold text-[10px] uppercase hover:text-blue-400 transition-colors"
            >
              <Plus size={14} /> Add Custom Pillar
            </button>
          </div>
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded border transition-colors ${showArchived ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'border-gray-800 text-gray-600'}`}
          >
            {showArchived ? 'Showing All' : 'Show Archived'}
          </button>
        </div>

        {addingPillar && (
          <form onSubmit={handleAddPillar} className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Exercise Name</label>
                <input 
                  name="name" type="text" placeholder="e.g. Overhead Press"
                  className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Muscle Group</label>
                <select name="muscleGroup" className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500 appearance-none">
                  <option value="Push">Push</option>
                  <option value="Pull">Pull</option>
                  <option value="Legs">Legs</option>
                  <option value="Core">Core</option>
                  <option value="Full Body">Full Body</option>
                  <option value="Conditioning">Conditioning</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Target Cadence (Days)</label>
                <input 
                  name="cadence" type="number" defaultValue={7}
                  className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Notes (Optional)</label>
                <textarea 
                  name="notes" placeholder="Coaching cues, equipment settings..." maxLength={280}
                  className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500 min-h-[60px] resize-none"
                />
              </div>
            </div>
            {newExerciseError && <p className="text-red-400 text-[10px] font-bold uppercase">{newExerciseError}</p>}
            <div className="flex gap-2">
              <button 
                type="button" onClick={() => setAddingPillar(false)}
                className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-2 py-2 px-6 rounded-lg bg-blue-600 text-white text-xs font-bold uppercase"
              >
                Create Pillar
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-3">
          {pillars.map(p => (
            <div key={p.id} className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden ${p.isActive === false ? 'opacity-50' : ''}`}>
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                   {p.isActive === false && <Archive size={14} className="text-gray-500" />}
                   <div>
                    <h4 className={`font-bold ${p.isActive === false ? 'text-gray-500 line-through' : 'text-gray-100'}`}>{p.name}</h4>
                    <p className="text-[10px] text-gray-500 uppercase">{p.muscleGroup} • {p.cadenceDays} Day Cycle</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleArchive(p)}
                    className={`p-2 transition-colors ${p.isActive === false ? 'text-blue-500' : 'text-gray-600 hover:text-red-400'}`}
                    title={p.isActive === false ? "Restore" : "Archive"}
                  >
                    {p.isActive === false ? <RotateCcw size={16} /> : <Archive size={16} />}
                  </button>
                  <button 
                    onClick={() => startEditing(p)}
                    className="p-2 text-gray-400 active:text-white"
                    title="Edit Pillar"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
              
              {editingPillar === p.id && editForm && (
                <div className="p-4 border-t border-gray-800 bg-gray-800/30 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Cadence</label>
                      <input 
                        type="number" 
                        className="bg-gray-950 border border-gray-700 rounded p-2 text-sm outline-none focus:border-blue-500 text-white"
                        value={editForm.cadenceDays}
                        onChange={e => updateEditForm({ cadenceDays: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Min Working Weight</label>
                      <input 
                        type="number" 
                        className="bg-gray-950 border border-gray-700 rounded p-2 text-sm outline-none focus:border-blue-500 text-white"
                        value={editForm.minWorkingWeight}
                        onChange={e => updateEditForm({ minWorkingWeight: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Notes</label>
                      <span className={`text-[10px] font-bold ${(editForm.notes?.length || 0) > 250 ? 'text-yellow-500' : 'text-gray-600'}`}>
                        {editForm.notes?.length || 0}/280
                      </span>
                    </div>
                    <textarea 
                      className="bg-gray-950 border border-gray-700 rounded p-2 text-sm outline-none focus:border-blue-500 min-h-[80px] resize-none text-white"
                      placeholder="Add coaching cues, tips, or equipment settings..."
                      value={editForm.notes || ''}
                      maxLength={280}
                      onChange={e => updateEditForm({ notes: e.target.value })}
                    />
                  </div>

                  {/* Progressive Overload Config */}
                  <div className="bg-black/20 p-3 rounded-lg border border-gray-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="overload-toggle" className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-2">
                        <ShieldCheck size={14} className={editForm.enableOverloadTracking ? "text-blue-500" : "text-gray-600"} />
                        Progressive Overload Tracking
                      </label>
                      <input 
                        id="overload-toggle"
                        type="checkbox"
                        className="accent-blue-500 w-4 h-4"
                        checked={editForm.enableOverloadTracking || false}
                        onChange={e => updateEditForm({ enableOverloadTracking: e.target.checked })}
                      />
                    </div>
                    
                    {editForm.enableOverloadTracking && (
                      <div className="flex flex-col gap-1 animate-in slide-in-from-top-1">
                        <label htmlFor="overload-threshold" className="text-[10px] text-gray-500 uppercase font-bold">Sessions to Mastery (Threshold)</label>
                        <input 
                          id="overload-threshold"
                          type="number"
                          min="1"
                          className="bg-gray-950 border border-gray-700 rounded p-2 text-sm outline-none focus:border-blue-500 text-white"
                          value={editForm.overloadThreshold || 5}
                          onChange={e => updateEditForm({ overloadThreshold: Math.max(1, parseInt(e.target.value) || 5) })}
                        />
                        <p className="text-[10px] text-gray-600 italic">Alerts you to increase weight after {editForm.overloadThreshold || 5} successful workouts.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Linked Accessories</label>
                    <div className="flex flex-wrap gap-2">
                      {accessories.map(acc => {
                        const isLinked = (editForm.preferredAccessoryIds || []).includes(acc.id);
                        return (
                          <button
                            key={acc.id}
                            onClick={() => {
                              const currentIds = editForm.preferredAccessoryIds || [];
                              const newIds = isLinked 
                                ? currentIds.filter(id => id !== acc.id)
                                : [...currentIds, acc.id];
                              updateEditForm({ preferredAccessoryIds: newIds });
                            }}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border ${
                              isLinked 
                                ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-500'
                            }`}
                          >
                            {acc.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={cancelEdit}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 text-gray-400 text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button 
                      onClick={saveEdit}
                      className="flex-2 py-2.5 px-6 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                    >
                      <Check size={14} /> Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-gray-400 font-bold uppercase text-xs tracking-widest">Accessory Catalog</h3>
          <button 
            onClick={() => {
              setAddingAccessory(!addingAccessory);
              setNewExerciseError(null);
            }}
            className="flex items-center gap-1.5 text-blue-500 font-bold text-[10px] uppercase hover:text-blue-400 transition-colors w-fit"
          >
            <Plus size={14} /> Add Custom Accessory
          </button>
        </div>

        {addingAccessory && (
          <form onSubmit={handleAddAccessory} className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase font-bold">Accessory Name</label>
              <input 
                name="name" type="text" placeholder="e.g. Bicep Curls"
                className="bg-gray-950 border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
            {newExerciseError && <p className="text-red-400 text-[10px] font-bold uppercase">{newExerciseError}</p>}
            <div className="flex gap-2">
              <button 
                type="button" onClick={() => setAddingAccessory(false)}
                className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-2 py-2 px-6 rounded-lg bg-blue-600 text-white text-xs font-bold uppercase"
              >
                Create Accessory
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Danger Zone */}
      <section className="flex flex-col gap-3 mt-4 border-t border-red-500/10 pt-6">
        <h3 className="text-red-500/60 font-bold uppercase text-[10px] tracking-widest">Danger Zone</h3>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={runRepair}
            className="w-full text-blue-400/60 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold border border-blue-500/10 active:border-blue-500/30"
          >
            <Wrench size={14} /> Repair DB
          </button>
          <button 
            onClick={async () => {
              if(confirm('Wipe everything? This action cannot be undone.')) {
                await repository.deleteDatabase();
                window.location.reload();
              }
            }}
            className="w-full text-red-500/60 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold border border-red-500/10 active:border-red-500/30"
          >
            <Trash2 size={14} /> Factory Reset
          </button>
        </div>
      </section>

      <div className="py-8 text-center text-gray-800 text-[10px] uppercase font-bold tracking-widest">
        Workout Buddy v{APP_VERSION} • {stats.sessions} Sessions
      </div>
    </div>
  );
};

export default Settings;
