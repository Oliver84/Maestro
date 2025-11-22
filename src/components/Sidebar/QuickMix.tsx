import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Volume2, Save } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getOscClient } from '../../services/OscClient';
import { throttle } from '../../utils/throttle';

export const QuickMix: React.FC = () => {
  const {
    x32Channels,
    selectedChannelIds,
    settings,
    channelMeters,
    updateChannelFader,
    updateChannelMute,
    selectedCueId,
    cues,
    updateCue
  } = useAppStore();

  const [dragging, setDragging] = useState<number | null>(null);
  const [mode, setMode] = useState<'LIVE' | 'EDIT'>('LIVE');
  const [draftState, setDraftState] = useState<Record<number, { faderLevel: number, muted: boolean }>>({});
  const faderRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const oscClient = useMemo(() => getOscClient(), []);

  const selectedCue = useMemo(() => cues.find(c => c.id === selectedCueId), [cues, selectedCueId]);

  // Sync draft state when entering Edit mode or selecting a different cue
  useEffect(() => {
    if (mode === 'EDIT' && selectedCue) {
      if (selectedCue.channelState) {
        // Load saved state
        setDraftState({ ...selectedCue.channelState });
      } else {
        // Snapshot current live state
        const snapshot: Record<number, { faderLevel: number, muted: boolean }> = {};
        x32Channels.forEach(ch => {
          snapshot[ch.number] = { faderLevel: ch.faderLevel, muted: ch.muted };
        });
        setDraftState(snapshot);
      }
    }
  }, [mode, selectedCueId, selectedCue, x32Channels]);

  // Reset mode if no cue is selected
  useEffect(() => {
    if (!selectedCueId && mode === 'EDIT') {
      setMode('LIVE');
    }
  }, [selectedCueId, mode]);

  // Check if dirty
  const isDirty = useMemo(() => {
    if (mode !== 'EDIT' || !selectedCue) return false;

    const savedState = selectedCue.channelState || {};

    // Compare draft with saved
    // Note: This simple check assumes keys are consistent.
    // If snapshot brings in new keys that aren't in saved, it might flag dirty, which is correct (new data to save).
    // But if saved is undefined, and we have a draft, it's definitely dirty.
    return JSON.stringify(draftState) !== JSON.stringify(savedState);
  }, [mode, selectedCue, draftState]);

  // Get selected channels from store
  const displayChannels = x32Channels.filter(ch =>
    selectedChannelIds.includes(ch.number)
  );

  // Create throttled OSC send functions (50ms throttle)
  const throttledSendFader = useMemo(
    () => throttle((channelNum: number, level: number) => {
      oscClient.setChannelFader(channelNum, level);
    }, 50),
    [oscClient]
  );

  const handleSave = () => {
    if (selectedCueId && mode === 'EDIT') {
      updateCue(selectedCueId, { channelState: draftState });
      // Flash feedback or just rely on the dirty indicator disappearing?
      // Dirty indicator will disappear automatically because savedState now equals draftState
    }
  };

  const handleLevelChange = (channelNum: number, newLevel: number) => {
    if (mode === 'LIVE') {
      // Update store immediately for responsive UI
      updateChannelFader(channelNum, newLevel);
      // Send OSC command (throttled)
      throttledSendFader(channelNum, newLevel);
      console.log(`[QuickMix] Channel ${channelNum} fader: ${newLevel.toFixed(2)}`);
    } else {
      // Edit Mode: Update draft only
      setDraftState(prev => ({
        ...prev,
        [channelNum]: {
          ...prev[channelNum],
          faderLevel: newLevel,
          muted: prev[channelNum]?.muted ?? false // Preserve mute or default
        }
      }));
    }
  };

  const handleMouseDown = (channelNum: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(channelNum);
    updateLevel(channelNum, e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging !== null) {
      updateLevel(dragging, e as any);
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const updateLevel = (channelNum: number, e: React.MouseEvent | MouseEvent) => {
    const fader = faderRefs.current[channelNum];
    if (!fader) return;

    const rect = fader.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const newLevel = 1 - (y / height);
    handleLevelChange(channelNum, Math.max(0, Math.min(1, newLevel)));
  };

  const toggleMute = (channelNum: number) => {
    if (mode === 'LIVE') {
      const channel = x32Channels.find(ch => ch.number === channelNum);
      if (channel) {
        const newMutedState = !channel.muted;
        updateChannelMute(channelNum, newMutedState);
        oscClient.setChannelMute(channelNum, newMutedState);
        console.log(`[QuickMix] Channel ${channelNum} mute: ${newMutedState ? 'MUTED' : 'ON'}`);
      }
    } else {
      // Edit Mode
      setDraftState(prev => {
        const current = prev[channelNum] || { faderLevel: 0, muted: false };
        return {
          ...prev,
          [channelNum]: {
            ...current,
            muted: !current.muted
          }
        };
      });
    }
  };

  // IMPORTANT: All hooks must be called before any conditional returns
  useEffect(() => {
    if (dragging !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging]);

  // Helper to get current values based on mode
  const getChannelState = (channel: { number: number, faderLevel: number, muted: boolean }) => {
    if (mode === 'LIVE') {
      return { level: channel.faderLevel, muted: channel.muted };
    }
    // Edit Mode
    const draft = draftState[channel.number];
    // If channel not in draft (e.g. newly added channel), fallback to live or zero?
    // Logic says we initialized draft with snapshot, so it should be there.
    // Fallback to 0/false if something weird happens.
    return {
      level: draft?.faderLevel ?? 0,
      muted: draft?.muted ?? false
    };
  };

  // If no channels selected, show placeholder
  if (displayChannels.length === 0) {
    return (
      <div className="border-t border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Volume2 size={12} />
            Quick Mix
          </h3>
          {settings.simulationMode && (
            <span className="text-[9px] text-amber-500 font-bold">Simulation</span>
          )}
        </div>
        <div className="text-xs text-slate-600 text-center py-8">
          No channels selected. Open Settings to import channels from X32.
        </div>
      </div>
    );
  }

  return (
    <div className={`border-t border-slate-800 p-3 transition-colors ${mode === 'EDIT' ? 'bg-amber-950/20' : 'bg-slate-950/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Volume2 size={12} />
            Quick Mix
          </h3>

          {/* Mode Toggle */}
          <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800">
            <button
              onClick={() => setMode('LIVE')}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                mode === 'LIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              LIVE
            </button>
            <button
              onClick={() => selectedCueId && setMode('EDIT')}
              disabled={!selectedCueId}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                mode === 'EDIT'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 disabled:opacity-30'
              }`}
            >
              EDIT
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Button */}
          {mode === 'EDIT' && isDirty && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-bold rounded animate-pulse"
            >
              <Save size={10} />
              SAVE
            </button>
          )}

          {settings.simulationMode ? (
            <span className="text-[9px] text-amber-500 font-bold">Sim</span>
          ) : (
            <span className="text-[9px] text-emerald-500 font-bold">On</span>
          )}
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(48px, 1fr))' }}>
        {displayChannels.map((channel) => {
          const { level, muted } = getChannelState(channel);

          return (
          <div key={channel.number} className="flex flex-col items-center gap-1.5">
            {/* Level display */}
            <div className={`text-[9px] font-mono font-bold ${mode === 'EDIT' ? 'text-amber-500' : 'text-slate-500'}`}>
              {level.toFixed(2)}
            </div>

            {/* Fader + Meter Container */}
            <div className="flex gap-1">
              {/* Meter (Always Live) */}
              <div className="w-2 h-24 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="w-full bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75 ease-linear"
                  style={{
                    height: `${Math.min((channelMeters[channel.number] || 0) * 100, 100)}%`,
                    marginTop: `${100 - Math.min((channelMeters[channel.number] || 0) * 100, 100)}%`
                  }}
                />
              </div>

              {/* Fader track container */}
              <div
                ref={el => faderRefs.current[channel.number] = el}
                className={`relative w-9 h-24 bg-slate-900/80 rounded border shadow-inner cursor-pointer select-none overflow-hidden ${
                  mode === 'EDIT' ? 'border-amber-900/50' : 'border-slate-800'
                }`}
                onMouseDown={(e) => handleMouseDown(channel.number, e)}
              >
                {/* Fill */}
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded ${muted
                    ? 'bg-slate-700/50'
                    : (mode === 'EDIT' ? 'bg-gradient-to-t from-amber-600 to-amber-400' : 'bg-gradient-to-t from-emerald-500 to-emerald-400')
                    }`}
                  style={{
                    height: `${Math.max(level * 100, 0)}%`,
                  }}
                />
              </div>
            </div>

            {/* Draggable slider handle */}
            <div className="relative w-12 h-24 -mt-24 pointer-events-none mb-3">
              <div
                className={`absolute w-10 h-6 rounded transition-transform border-2 ${
                  muted
                    ? 'bg-slate-600/90 border-slate-500'
                    : (mode === 'EDIT'
                        ? 'bg-amber-700/90 border-amber-400/70 shadow-lg shadow-amber-900/20'
                        : 'bg-slate-700/90 border-emerald-400/70 shadow-lg'
                      )
                  } ${dragging === channel.number ? 'scale-105' : ''}`}
                style={{
                  bottom: `calc(${level * 100}% - 12px)`,
                  left: '14px'
                }}
              />
            </div>

            {/* Mute button */}
            <button
              onClick={() => toggleMute(channel.number)}
              className={`w-12 px-1.5 py-0.5 rounded text-[8px] font-bold transition-all ${muted
                ? 'bg-red-900/60 text-red-200 border border-red-800/50'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:bg-slate-700'
                }`}
            >
              {muted ? 'MUTE' : 'ON'}
            </button>

            {/* Label */}
            <div className="text-[8px] font-bold text-slate-500 text-center uppercase tracking-wider w-full break-words leading-tight px-0.5">
              {channel.name}
            </div>
          </div>
        )})}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800/50">
        <div className="text-[8px] text-slate-600 text-center font-mono">
          {mode === 'EDIT' ? `EDITING: ${selectedCue?.title || 'Unknown'}` : (settings.simulationMode ? 'SIMULATION MODE' : 'LIVE CONTROL')}
        </div>
      </div>
    </div>
  );
};
