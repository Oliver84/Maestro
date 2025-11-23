import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Volume2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getOscClient } from '../../services/OscClient';
import { throttle } from '../../utils/throttle';
import { faderToDb } from '../../utils/audioMath';
import { ChannelStrip } from './ChannelStrip';

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
  const faderRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const oscClient = useMemo(() => getOscClient(), []);

  const selectedCue = useMemo(() => cues.find(c => c.id === selectedCueId), [cues, selectedCueId]);

  // Ensure cue has channel state when entering edit mode
  useEffect(() => {
    if (mode === 'EDIT' && selectedCue) {
      if (!selectedCue.channelState) {
        // Snapshot current live state and save immediately
        const snapshot: Record<number, { faderLevel: number, muted: boolean }> = {};
        x32Channels.forEach(ch => {
          snapshot[ch.number] = { faderLevel: ch.faderLevel, muted: ch.muted };
        });
        updateCue(selectedCue.id, { channelState: snapshot });
      }
    }
  }, [mode, selectedCueId, selectedCue, x32Channels, updateCue]);

  // Reset mode if no cue is selected
  useEffect(() => {
    if (!selectedCueId && mode === 'EDIT') {
      setMode('LIVE');
    }
  }, [selectedCueId, mode]);

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



  const handleLevelChange = useCallback((channelNum: number, newLevel: number) => {
    if (mode === 'LIVE') {
      updateChannelFader(channelNum, newLevel);
      throttledSendFader(channelNum, newLevel);
      if (settings.debug) console.log(`[QuickMix] Channel ${channelNum} fader: ${newLevel.toFixed(2)} (${faderToDb(newLevel)})`);
    } else {
      // Edit Mode: Auto-save
      if (selectedCue) {
        const currentChannelState = selectedCue.channelState || {};
        const newState = {
          ...currentChannelState,
          [channelNum]: {
            faderLevel: newLevel,
            muted: currentChannelState[channelNum]?.muted ?? false
          }
        };
        updateCue(selectedCue.id, { channelState: newState });
      }
    }
  }, [mode, selectedCue, settings.debug, throttledSendFader, updateChannelFader, updateCue]);

  const handleMouseDown = useCallback((channelNum: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(channelNum);
    // Trigger immediate update on click
    const fader = faderRefs.current[channelNum];
    if (fader) {
        const rect = fader.getBoundingClientRect();
        const capHeight = 40;
        const travelHeight = rect.height - capHeight;
        const yFromBottom = rect.height - (e.clientY - rect.top);
        const rawLevel = (yFromBottom - (capHeight / 2)) / travelHeight;
        const newLevel = Math.max(0, Math.min(1, rawLevel));

        handleLevelChange(channelNum, newLevel);
    }
  }, [handleLevelChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging !== null) {
      updateLevel(dragging, e);
    }
  }, [dragging]); // updateLevel needs to be stable or referenced

  // We need updateLevel to be available to handleMouseMove, but it depends on state.
  // Let's define updateLevel inside the component scope but ensure it's stable enough.
  const updateLevel = (channelNum: number, e: MouseEvent) => {
    const fader = faderRefs.current[channelNum];
    if (!fader) return;

    const rect = fader.getBoundingClientRect();
    const capHeight = 40; // h-10 is 2.5rem = 40px
    const travelHeight = rect.height - capHeight;

    // Calculate y from bottom of the track
    const yFromBottom = rect.height - (e.clientY - rect.top);

    // Map to 0-1 range based on center of cap travel
    // Center of cap at bottom = capHeight / 2
    // Center of cap at top = rect.height - capHeight / 2
    // Effective travel range = rect.height - capHeight

    const rawLevel = (yFromBottom - (capHeight / 2)) / travelHeight;
    const newLevel = Math.max(0, Math.min(1, rawLevel));

    handleLevelChange(channelNum, newLevel);
  };

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);


  const toggleMute = useCallback((channelNum: number) => {
    if (mode === 'LIVE') {
      const channel = x32Channels.find(ch => ch.number === channelNum);
      if (channel) {
        const newMutedState = !channel.muted;
        updateChannelMute(channelNum, newMutedState);
        oscClient.setChannelMute(channelNum, newMutedState);
        if (settings.debug) console.log(`[QuickMix] Channel ${channelNum} mute: ${newMutedState ? 'MUTED' : 'ON'}`);
      }
    } else {
      // Edit Mode: Auto-save
      if (selectedCue) {
        const currentChannelState = selectedCue.channelState || {};
        const currentSettings = currentChannelState[channelNum] || { faderLevel: 0, muted: false };

        const newState = {
          ...currentChannelState,
          [channelNum]: {
            ...currentSettings,
            muted: !currentSettings.muted
          }
        };
        updateCue(selectedCue.id, { channelState: newState });
      }
    }
  }, [mode, x32Channels, settings.debug, selectedCue, oscClient, updateChannelMute, updateCue]);

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
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Helper to get current values based on mode
  const getChannelState = useCallback((channel: { number: number, faderLevel: number, muted: boolean }) => {
    if (mode === 'LIVE') {
      return { level: channel.faderLevel, muted: channel.muted };
    }
    // Edit Mode
    const savedState = selectedCue?.channelState?.[channel.number];
    // If not saved yet, use live values (snapshot logic above handles initial save, but for render safety fallback)
    return {
      level: savedState?.faderLevel ?? channel.faderLevel,
      muted: savedState?.muted ?? channel.muted
    };
  }, [mode, selectedCue]);

  // Stable ref callbacks
  const setRef = useCallback((channelNumber: number, el: HTMLDivElement | null) => {
    if (el) faderRefs.current[channelNumber] = el;
  }, []);

  // To truly make "setRef" stable for each iteration without creating a new function,
  // we can't easily do it inside map unless we use a memoized array of functions.
  const refCallbacks = useMemo(() => {
    const callbacks: Record<number, (el: HTMLDivElement | null) => void> = {};
    // Create callbacks for all potential channels (1-32)
    for (let i = 1; i <= 32; i++) {
        callbacks[i] = (el) => { if (el) faderRefs.current[i] = el; };
    }
    return callbacks;
  }, []);


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
    <div className={`h-full flex flex-col border-t border-slate-800 p-2 transition-colors overflow-hidden ${mode === 'EDIT' ? 'bg-amber-950/20' : 'bg-slate-950/50'}`}>
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Volume2 size={12} />
            Quick Mix
          </h3>

          {/* Mode Toggle */}
          <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800">
            <button
              onClick={() => setMode('LIVE')}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${mode === 'LIVE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              LIVE
            </button>
            <button
              onClick={() => selectedCueId && setMode('EDIT')}
              disabled={!selectedCueId}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${mode === 'EDIT'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300 disabled:opacity-30'
                }`}
            >
              EDIT
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {settings.simulationMode ? (
            <span className="text-[9px] text-amber-500 font-bold">Sim</span>
          ) : (
            <span className="text-[9px] text-emerald-500 font-bold">On</span>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-x-auto gap-2 pb-2 px-1 snap-x scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent min-h-0">
        {displayChannels.map((channel) => {
          const { level, muted } = getChannelState(channel);

          return (
            <ChannelStrip
              key={channel.number}
              channelNumber={channel.number}
              name={channel.name}
              level={level}
              muted={muted}
              meterValue={channelMeters[channel.number] || 0}
              mode={mode}
              debug={!!settings.debug}
              onLevelChange={handleLevelChange}
              onMuteToggle={toggleMute}
              onMouseDown={handleMouseDown}
              ref={refCallbacks[channel.number]}
            />
          );
        })}
      </div>

      <div className="mt-1 pt-1 border-t border-slate-800/50 shrink-0">
        <div className="text-[8px] text-slate-600 text-center font-mono">
          {mode === 'EDIT' ? `EDITING: ${selectedCue?.title || 'Unknown'}` : (settings.simulationMode ? 'SIMULATION MODE' : 'LIVE CONTROL')}
        </div>
      </div>
    </div>
  );
};
