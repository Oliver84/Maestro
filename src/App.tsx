import { useState, useEffect } from 'react'
import { Settings, Wifi, Activity } from 'lucide-react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Dashboard } from './components/Dashboard/Dashboard'
import { Sidebar } from './components/Sidebar/Sidebar'
import { SettingsModal } from './components/Settings/SettingsModal'
import { ToastContainer } from './components/Toast/Toast'
import { KeyboardShortcuts } from './components/KeyboardShortcuts/KeyboardShortcuts'
import { PerformanceOverlay } from './components/PerformanceOverlay/PerformanceOverlay'
import { ShowTimer } from './components/ShowTimer/ShowTimer'
import { useAppStore } from './store/useAppStore'
import { initializeMockChannels } from './utils/mockData'

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false)
  const { settings, selectNextCue, selectPreviousCue, fireCue, selectedCueId, toasts, dismissToast, addToast } = useAppStore()

  // Initialize Audio Engine on mount (warmup)
  useEffect(() => {
    import('./services/AudioEngine').then(({ AudioEngine }) => {
      AudioEngine.init();
    });
  }, []);

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

  // Sync simulation and debug mode with OscClient
  useEffect(() => {
    import('./services/OscClient').then(({ getOscClient }) => {
      const client = getOscClient();
      client.setSimulationMode(settings.simulationMode);
      client.setDebugMode(!!settings.debug);
    });
  }, [settings.simulationMode, settings.debug]);

  // Sync settings with Electron Main process
  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.setX32Ip(settings.x32Ip);
    }
  }, [settings.x32Ip])

  // Sync Audio Device with AudioEngine
  useEffect(() => {
    import('./services/AudioEngine').then(({ AudioEngine }) => {
      AudioEngine.setOutputDevice(settings.audioDeviceId);
    });
  }, [settings.audioDeviceId]);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focused on an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectNextCue();
          addToast('Next cue selected', 'action', 1500);
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectPreviousCue();
          addToast('Previous cue selected', 'action', 1500);
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          const state = useAppStore.getState();

          // If paused, resume
          if (state.isPaused) {
            state.resume();
            addToast('Resumed', 'action', 1500);
            return;
          }

          // Fire selected, or fallback to next available logic
          if (selectedCueId) {
            const cue = state.cues.find(c => c.id === selectedCueId);
            fireCue(selectedCueId);
            addToast(`GO: ${cue?.title || 'Cue fired'}`, 'success', 2000);
          } else {
            // Auto-select first logic handled in store usually, but just in case
            if (state.cues.length > 0) {
              fireCue(state.cues[0].id);
              addToast(`GO: ${state.cues[0].title}`, 'success', 2000);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift + ESC = Hard Stop
            useAppStore.getState().stopAll();
            useAppStore.getState().resetShowTimer();
            addToast('HARD STOP - All audio stopped', 'error', 2000);
          } else {
            // ESC = Toggle Pause/Resume
            useAppStore.getState().panic();

            // Check new state to show appropriate message
            const newState = useAppStore.getState();
            if (newState.isPaused) {
              addToast('PAUSED - Press ESC to Resume, Shift+ESC to Stop', 'info', 2000);
            } else {
              addToast('RESUMED', 'success', 1500);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectNextCue, selectPreviousCue, fireCue, selectedCueId, addToast]);

  const handleConnectX32 = () => {
    import('./services/OscClient').then(({ getOscClient }) => {
      const client = getOscClient();
      client.updateConnection(settings.x32Ip);
    });
  };

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
            <ShowTimer />
            <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded border border-slate-700">
              <div className={`w-2 h-2 rounded-full ${settings.simulationMode ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {settings.simulationMode ? 'SIMULATION MODE' : 'X32 READY'}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div className="flex items-center gap-3">
            <button
              onClick={handleConnectX32}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Wifi size={16} />
              Connect X32
            </button>
            <button
              onClick={() => setIsPerformanceOpen(!isPerformanceOpen)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm font-medium transition-colors flex items-center gap-2"
              title="Toggle Performance Overlay (Cmd+Shift+M)"
            >
              <Activity size={16} />
              Perf
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

      {/* Main Content Area with Resizable Panels */}
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Left Panel: Dashboard (Current/Next/Go) */}
          <Panel defaultSize={30} minSize={20} maxSize={50}>
            <div className="h-full border-r border-slate-800 flex flex-col bg-slate-950 relative z-10 shadow-2xl">
              <Dashboard />
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-emerald-500/50 transition-colors cursor-col-resize" />

          {/* Right Panel: Cue List */}
          <Panel defaultSize={70} minSize={50}>
            <div className="h-full flex flex-col bg-slate-900/50 min-w-0">
              <Sidebar />
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Footer - Fixed Height */}
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

      {/* Global Overlays */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <KeyboardShortcuts />
      <PerformanceOverlay
        isVisible={isPerformanceOpen}
        onToggle={setIsPerformanceOpen}
      />
    </div>
  )
}

export default App
