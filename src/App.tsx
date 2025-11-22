import { useState, useEffect } from 'react'
import { Settings, Wifi } from 'lucide-react'
import { Dashboard } from './components/Dashboard/Dashboard'
import { Sidebar } from './components/Sidebar/Sidebar'
import { SettingsModal } from './components/Settings/SettingsModal'
import { useAppStore } from './store/useAppStore'
import { initializeMockChannels } from './utils/mockData'

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { settings, selectNextCue, selectPreviousCue, fireCue, selectedCueId, activeCueId, cues } = useAppStore()

  // Initialize mock channels (but NOT cues) for simulation mode
  useEffect(() => {
    if (settings.simulationMode) {
      initializeMockChannels();
    }
  }, [settings.simulationMode]);

  // Initialize OscClient logging
  useEffect(() => {
    import('./services/OscClient').then(({ getOscClient }) => {
      getOscClient().setLogCallback((msg) => {
        useAppStore.getState().addLog(msg);
      });
    });
  }, []);

  // Sync simulation mode with OscClient
  useEffect(() => {
    import('./services/OscClient').then(({ getOscClient }) => {
      getOscClient().setSimulationMode(settings.simulationMode);
    });
  }, [settings.simulationMode]);

  // Sync settings with Electron Main process
  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.setX32Ip(settings.x32Ip);
    }
  }, [settings.x32Ip])

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focused on an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectNextCue();
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectPreviousCue();
          break;
        case ' ':
          e.preventDefault();
          // Fire selected, or fallback to next available logic
          if (selectedCueId) {
            fireCue(selectedCueId);
          } else {
            // Auto-select first logic handled in store usually, but just in case
            const state = useAppStore.getState();
            if (state.cues.length > 0) fireCue(state.cues[0].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          useAppStore.getState().stopAll();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectNextCue, selectPreviousCue, fireCue, selectedCueId]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Global Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-emerald-500/20">M</div>
          <div>
            <h1 className="font-black text-xl tracking-tight leading-none text-white">MAESTRO <span className="text-emerald-500">SHOW CONTROL</span></h1>
            <div className="text-xs text-slate-500 font-medium tracking-wider uppercase">Trophy Club Nativity</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Status Indicators */}
          <div className="flex items-center gap-4 text-xs font-bold tracking-wider">
            <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded border border-slate-700">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              X32 CONSOLE WAITING...
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm font-medium transition-colors flex items-center gap-2">
              <Wifi size={16} />
              Connect X32
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-slate-800 rounded border border-transparent hover:border-slate-700 transition-colors text-slate-400 hover:text-white"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Dashboard (Current/Next/Go) */}
        <div className="w-[480px] border-r border-slate-800 flex flex-col bg-slate-950 relative z-10 shadow-2xl">
          <Dashboard />
        </div>

        {/* Right Panel: Cue List */}
        <div className="flex-1 flex flex-col bg-slate-900/50 min-w-0">
          <Sidebar />
        </div>
      </div>

      {/* Footer */}
      <footer className="h-8 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-4 text-xs font-mono text-slate-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>MODE: <span className="text-slate-300">SIMULATION</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span>X32 TARGET: <span className="text-slate-300">{settings.x32Ip}</span></span>
        </div>
      </footer>

      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}

export default App
