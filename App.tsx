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
import { Home, History as HistoryIcon, Settings as SettingsIcon, AlertCircle } from 'lucide-react';

type View = 'dashboard' | 'setup' | 'session' | 'summary' | 'history' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeSession, setActiveSession] = useState<Partial<WorkoutSession> | null>(null);
  const [lastFinishedSession, setLastFinishedSession] = useState<WorkoutSession | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [numPillars, setNumPillars] = useState(2);
  const [preselectedPillar, setPreselectedPillar] = useState<Pillar | null>(null);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center">
        <AlertCircle size={40} className="text-red-500 mb-4" />
        <h1 className="font-display text-2xl font-black uppercase tracking-wider mb-2">Database Error</h1>
        <p className="text-gray-500 font-display text-sm max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-3 bg-orange-500 text-black font-display font-black uppercase tracking-widest rounded-lg"
        >
          RETRY
        </button>
      </div>
    );
  }

  if (!initialized) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <span className="font-display text-xl font-black tracking-[0.4em] text-gray-600 uppercase">LOADING</span>
    </div>
  );

  const startSetup = () => {
    setPreselectedPillar(null);
    setCurrentView('setup');
  };

  const handleStartSpecificWorkout = (pillar: Pillar) => {
    setPreselectedPillar(pillar);
    setNumPillars(1);
    setCurrentView('setup');
  };
  
  const startSession = (pillars: Pillar[], date?: number) => {
    const session: Partial<WorkoutSession> = {
      date: date || Date.now(),
      pillarsPerformed: pillars.map(p => {
        const initialWeight = Math.max(p.prWeight, p.minWorkingWeight);
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
    setPreselectedPillar(null);
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
        return (
          <Dashboard 
            key="dashboard" 
            onStart={startSetup} 
            onStartSpecificWorkout={handleStartSpecificWorkout}
            currentView={currentView} 
          />
        );
      case 'setup':
        return (
          <SetupWorkout 
            onCancel={() => setCurrentView('dashboard')} 
            onStart={startSession} 
            selectedFocus={selectedFocus}
            setSelectedFocus={setSelectedFocus}
            numPillars={numPillars}
            setNumPillars={setNumPillars}
            preselectedPillar={preselectedPillar}
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
      default:
        return <Dashboard onStart={startSetup} />;
    }
  };

  const showNav = currentView !== 'setup' && currentView !== 'session';

  const isNavActive = (views: View[]) => views.includes(currentView);

  return (
    <div className="flex flex-col min-h-screen bg-gray-950" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {config && !config.storagePersisted && currentView === 'dashboard' && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center gap-2">
          <AlertCircle size={14} className="text-yellow-500 shrink-0" />
          <p className="font-display text-[11px] text-yellow-200 tracking-wide uppercase">Storage is volatile — export backups regularly.</p>
          <button onClick={() => setCurrentView('settings')} className="font-display text-[11px] text-orange-500 underline ml-auto font-black uppercase tracking-wider">Back Up</button>
        </div>
      )}

      <main className="flex-grow flex flex-col" style={showNav ? { paddingBottom: 'calc(3.5rem + max(env(safe-area-inset-bottom), 1rem))' } : {}}>
        {renderView()}
      </main>

      {currentView !== 'setup' && currentView !== 'session' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800/60 flex justify-around z-50" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-0.5 px-6 pt-2 border-t-2 transition-colors ${isNavActive(['dashboard', 'summary']) ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-600'}`}
          >
            <Home size={20} />
            <span className="font-display text-[10px] uppercase tracking-widest">Home</span>
          </button>
          <button
            onClick={() => setCurrentView('history')}
            className={`flex flex-col items-center gap-0.5 px-6 pt-2 border-t-2 transition-colors ${isNavActive(['history']) ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-600'}`}
          >
            <HistoryIcon size={20} />
            <span className="font-display text-[10px] uppercase tracking-widest">History</span>
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`flex flex-col items-center gap-0.5 px-6 pt-2 border-t-2 transition-colors ${isNavActive(['settings']) ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-600'}`}
          >
            <SettingsIcon size={20} />
            <span className="font-display text-[10px] uppercase tracking-widest">Settings</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;