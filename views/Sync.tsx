import React, { useState, useEffect } from 'react';
import { User } from '@firebase/auth';
import { onAuthChange, signIn, signUp, signOut } from '../services/auth';
import { uploadToCloud, downloadFromCloud } from '../services/cloud-rest';
import { Cloud, Upload, Download, LogOut, Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const Sync: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!confirm('This will overwrite your existing cloud backup. Continue?')) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await uploadToCloud();
      setSuccess('Local data pushed to cloud successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!confirm('OVERWRITE LOCAL DATA? This cannot be undone. All your current local history will be replaced by the cloud backup.')) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const restored = await downloadFromCloud();
      if (restored) {
        setSuccess('Cloud data pulled and restored successfully! App will reload.');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError('No backup found in the cloud.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 max-w-md mx-auto flex flex-col gap-6">
        <header className="text-center space-y-2">
          <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Cloud className="text-blue-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold">Cloud Sync</h1>
          <p className="text-gray-500 text-sm">Sign in to back up your workouts to the cloud.</p>
        </header>

        <form onSubmit={handleAuth} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
              <Mail size={12} /> Email
            </label>
            <input 
              type="email" 
              required
              className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
              <Lock size={12} /> Password
            </label>
            <input 
              type="password" 
              required
              className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-2 text-xs text-red-400">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>

          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-xs text-gray-500 hover:text-blue-400 font-bold uppercase tracking-wider transition-colors"
          >
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto flex flex-col gap-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Sync Center</h1>
          <p className="text-gray-500 text-xs truncate max-w-[200px]">Logged in as {user.email}</p>
        </div>
        <button 
          onClick={() => signOut()}
          className="bg-gray-800 p-2 rounded-full text-gray-400 hover:text-white"
          title="Sign Out"
        >
          <LogOut size={20} />
        </button>
      </header>

      <section className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
        <div className="bg-blue-500/20 p-4 rounded-full">
          <Cloud className="text-blue-500" size={40} />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">Manual Push & Pull</h2>
          <p className="text-xs text-gray-400">Back up your local progress to the cloud or restore from a previous backup.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={handleUpload}
          disabled={loading}
          className="bg-gray-900 border border-gray-800 hover:bg-gray-800 py-4 rounded-2xl flex items-center justify-between px-6 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <Upload className="text-blue-500" size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-gray-100 uppercase tracking-tight">Push to Cloud</p>
              <p className="text-[10px] text-gray-500">Overwrite cloud with local data</p>
            </div>
          </div>
        </button>

        <button 
          onClick={handleDownload}
          disabled={loading}
          className="bg-gray-900 border border-gray-800 hover:bg-gray-800 py-4 rounded-2xl flex items-center justify-between px-6 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="bg-orange-500/10 p-2 rounded-lg">
              <Download className="text-orange-500" size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-gray-100 uppercase tracking-tight">Pull from Cloud</p>
              <p className="text-[10px] text-gray-500">Overwrite local with cloud data</p>
            </div>
          </div>
        </button>
      </div>

      {(error || success) && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 text-sm ${error ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
          {error ? <AlertCircle size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
          <span>{error || success}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-bold uppercase animate-pulse">
          <Loader2 className="animate-spin" size={14} />
          Processing sync...
        </div>
      )}
    </div>
  );
};

export default Sync;
