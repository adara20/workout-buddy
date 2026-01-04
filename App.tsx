import React, { useState, useEffect } from 'react';
import { initOnce } from './db';
import { repository } from './services/repository';
import { uploadToCloud } from './services/cloud-rest';
import { WorkoutSession, Pillar, AppConfig, PillarEntry } from './types';
import { calculatePillarEntryUpdate } from './services/session';
import Dashboard from './views/Dashboard';
import SetupWorkout from './views/SetupWorkout';
import ActiveSession from './views/ActiveSession';
import Summary from './views/Summary';
import History from './views/History';
import Settings from './views/Settings';
import Sync from './views/Sync';
import { Home, History as HistoryIcon, Settings as SettingsIcon, AlertCircle, Cloud } from 'lucide-react';

type View = 'dashboard' | 'setup' | 'session' | 'summary' | 'history' | 'settings' | 'sync';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeSession, setActiveSession] = useState<Partial<WorkoutSession> | null>(null);
  const [lastFinishedSession, setLastFinishedSession] = useState<WorkoutSession | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [numPillars, setNumPillars] = useState(2);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initOnce().then(async () => {
      const cfg = await repository.getConfig();
      setConfig(cfg || null);
      
      // Register automatic sync listener
      repository.setSyncListener(async () => {
        try {
          await uploadToCloud();
        } catch (err) {
          console.warn('Auto-sync skipped:', err instanceof Error ? err.message : err);
        }
      });

      setInitialized(true);
    }).catch(err => {
      console.error("Database initialization failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Database Error</h1>
        <p className="text-gray-400 font-mono text-sm max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 px-4 py-2 bg-blue-600 rounded-lg font-bold"
        >
          RETRY
        </button>
      </div>
    );
  }

  if (!initialized) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white font-mono">LOADING_DB...</div>;

  const startSetup = () => setCurrentView('setup');
  
  const startSession = (pillars: Pillar[], date?: number) => {
    const session: Partial<WorkoutSession> = {
      date: date || Date.now(),
      pillarsPerformed: pillars.map(p => {
        const initialWeight = p.prWeight > 0 ? p.prWeight : p.minWorkingWeight;
        const initialEntry: PillarEntry = {
          pillarId: p.id,
          name: p.name,
          weight: initialWeight,
          counted: false,
          isPR: false,
          warning: false
        };
        return calculatePillarEntryUpdate(initialEntry, p, 0);
      }),
      accessoriesPerformed: []
    };
    setActiveSession(session);
    setCurrentView('session');
  };

  const completeSession = (session: WorkoutSession) => {
    setLastFinishedSession(session);
    setCurrentView('summary');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onStart={startSetup} />;
      case 'setup':
        return (
          <SetupWorkout 
            onCancel={() => setCurrentView('dashboard')} 
            onStart={startSession} 
            selectedFocus={selectedFocus}
            setSelectedFocus={setSelectedFocus}
            numPillars={numPillars}
            setNumPillars={setNumPillars}
          />
        );
      case 'session':
        return activeSession ? (
          <ActiveSession 
            initialSession={activeSession as WorkoutSession} 
            onComplete={completeSession}
            onCancel={() => {
              if (confirm('Discard workout in progress?')) {
                setCurrentView('dashboard');
              }
            }}
          />
        ) : <Dashboard onStart={startSetup} />;
      case 'summary':
        return lastFinishedSession ? (
          <Summary session={lastFinishedSession} onDone={() => setCurrentView('dashboard')} />
        ) : <Dashboard onStart={startSetup} />;
      case 'history':
        return <History />;
      case 'settings':
        return <Settings />;
      case 'sync':
        return <Sync />;
      default:
        return <Dashboard onStart={startSetup} />;
    }
  };

  const showNav = currentView !== 'setup' && currentView !== 'session';

  return (
    <div className={`flex flex-col min-h-screen bg-gray-950 ${showNav ? 'pb-20' : ''}`}>
      {config && !config.storagePersisted && currentView === 'dashboard' && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center gap-2">
          <AlertCircle size={14} className="text-yellow-500 shrink-0" />
          <p className="text-[10px] text-yellow-200 font-medium">Storage is volatile. Export backups regularly.</p>
          <button onClick={() => setCurrentView('settings')} className="text-[10px] text-yellow-500 underline ml-auto font-bold uppercase">Back Up</button>
        </div>
      )}

      <main className="flex-grow">
        {renderView()}
      </main>
      
      {currentView !== 'setup' && currentView !== 'session' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around p-3 z-50">
          <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' || currentView === 'summary' ? 'text-blue-500' : 'text-gray-400'}`}>
            <Home size={20} />
            <span className="text-xs">Home</span>
          </button>
          <button onClick={() => setCurrentView('sync')} className={`flex flex-col items-center gap-1 ${currentView === 'sync' ? 'text-blue-500' : 'text-gray-400'}`}>
            <Cloud size={20} />
            <span className="text-xs">Sync</span>
          </button>
          <button onClick={() => setCurrentView('history')} className={`flex flex-col items-center gap-1 ${currentView === 'history' ? 'text-blue-500' : 'text-gray-400'}`}>
            <HistoryIcon size={20} />
            <span className="text-xs">History</span>
          </button>
          <button onClick={() => setCurrentView('settings')} className={`flex flex-col items-center gap-1 ${currentView === 'settings' ? 'text-blue-500' : 'text-gray-400'}`}>
            <SettingsIcon size={20} />
            <span className="text-xs">Settings</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;