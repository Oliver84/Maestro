import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getOscClient } from '../../services/OscClient';
import { throttle } from '../../utils/throttle';
import { faderToDb, dbToFader } from '../../utils/audioMath';

const FaderValueInput: React.FC<{
  level: number;
  onCommit: (newLevel: number) => void;
  mode: 'LIVE' | 'EDIT';
}> = ({ level, onCommit, mode }) => {
  const [text, setText] = useState(faderToDb(level));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setText(faderToDb(level));
    }
  }, [level, isEditing]);

  const handleCommit = () => {
    setIsEditing(false);

    // Handle -oo special case
    if (text.toLowerCase().includes('oo') || text.toLowerCase().includes('inf')) {
      onCommit(0);
      setText('-oo dB');
      return;
    }

    const clean = text.replace(/[^\d.-]/g, '');
    let db = parseFloat(clean);

    if (isNaN(db)) {
      setText(faderToDb(level)); // Revert
      return;
    }

    // Clamp
    db = Math.max(-90, Math.min(10, db));

    const newLevel = dbToFader(db);
    onCommit(newLevel);
  };

  return (
    <input
      type="text"
      className={`text-[8px] font-mono font-medium tracking-tight bg-transparent text-center w-full border border-transparent hover:border-slate-700 focus:border-emerald-500 focus:bg-slate-900 focus:outline-none rounded px-0.5 transition-colors ${mode === 'EDIT' ? 'text-amber-500' : 'text-slate-500'}`}
      value={text}
      onFocus={(e) => {
        setIsEditing(true);
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
    />
  );
};

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



  const handleLevelChange = (channelNum: number, newLevel: number) => {
    if (mode === 'LIVE') {
      updateChannelFader(channelNum, newLevel);
      throttledSendFader(channelNum, newLevel);
      console.log(`[QuickMix] Channel ${channelNum} fader: ${newLevel.toFixed(2)} (${faderToDb(newLevel)})`);
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
    const savedState = selectedCue?.channelState?.[channel.number];
    // If not saved yet, use live values (snapshot logic above handles initial save, but for render safety fallback)
    return {
      level: savedState?.faderLevel ?? channel.faderLevel,
      muted: savedState?.muted ?? channel.muted
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
            <div key={channel.number} className="flex flex-col items-center gap-0.5 snap-start min-w-[50px] flex-1">
              {/* Header: Number & Level */}
              <div className="flex flex-col items-center gap-0.5 mb-1 w-full">
                {/* Channel Number Badge */}
                <div className={`flex items-center justify-center w-4 h-4 rounded border shadow-sm transition-colors ${muted
                  ? 'bg-slate-950 border-slate-900'
                  : 'bg-slate-800 border-slate-700'
                  }`}>
                  <span className={`text-[9px] font-black ${muted ? 'text-slate-700' : 'text-slate-300'}`}>{channel.number}</span>
                </div>

                {/* Level Value Input */}
                <FaderValueInput
                  level={level}
                  onCommit={(newLevel) => handleLevelChange(channel.number, newLevel)}
                  mode={mode}
                />
              </div>

              {/* Fader + Meter Group */}
              <div className="flex gap-2 h-32 relative items-end justify-center">
                {/* Meter (Always Live) */}
                <div className="w-1.5 h-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50 relative">
                  {/* Grid lines for meter */}
                  <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none opacity-20">
                    {[...Array(10)].map((_, i) => <div key={i} className="h-px bg-black w-full" />)}
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-emerald-600 via-emerald-400 to-emerald-200 transition-all duration-75 ease-linear opacity-90"
                    style={{
                      height: `${Math.min((channelMeters[channel.number] || 0) * 100, 100)}%`,
                      marginTop: `${100 - Math.min((channelMeters[channel.number] || 0) * 100, 100)}%`
                    }}
                  />
                </div>

                {/* Fader Track Area */}
                <div
                  className="relative w-8 h-full flex justify-center group"
                  ref={el => faderRefs.current[channel.number] = el}
                  onMouseDown={(e) => handleMouseDown(channel.number, e)}
                >
                  {/* Track Slot */}
                  <div className="absolute top-0 bottom-0 w-1 bg-slate-950 rounded-full border border-slate-800 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                    {/* Tick Marks */}
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                      {/* +10dB (Top) */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-px bg-slate-700" />
                      {/* 0dB (75%) */}
                      <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-3 h-0.5 bg-slate-500" />
                      {/* -10dB (50%) */}
                      <div className="absolute top-[50%] left-1/2 -translate-x-1/2 w-2 h-px bg-slate-700" />
                      {/* -30dB (25%) */}
                      <div className="absolute top-[75%] left-1/2 -translate-x-1/2 w-2 h-px bg-slate-700" />
                      {/* -oo (Bottom) */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-px bg-slate-700" />
                    </div>

                    {/* Fill Level in Track (Subtle) */}
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded-full w-full opacity-40 ${muted ? 'bg-slate-600' : (mode === 'EDIT' ? 'bg-amber-500' : 'bg-emerald-500')
                        }`}
                      style={{ height: `${Math.max(level * 100, 0)}%` }}
                    />
                  </div>

                  {/* Fader Cap */}
                  <div
                    className={`absolute w-8 h-10 rounded shadow-[0_4px_6px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.3)] border-t border-white/10 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-95 cursor-grab active:cursor-grabbing z-10 ${muted
                      ? 'bg-slate-800 border border-slate-700'
                      : (mode === 'EDIT'
                        ? 'bg-gradient-to-b from-amber-600 to-amber-700 border-x border-b border-amber-800'
                        : 'bg-gradient-to-b from-slate-700 to-slate-800 border-x border-b border-slate-900'
                      )
                      }`}
                    style={{
                      bottom: `calc(${level} * (100% - 40px))`,
                    }}
                  >
                    {/* Cap Detail - Grip Lines */}
                    <div className="flex flex-col gap-0.5 items-center justify-center w-full opacity-50">
                      <div className="w-4 h-px bg-black/40" />
                      <div className="w-4 h-px bg-white/10" />
                      <div className="w-4 h-px bg-black/40" />
                      <div className="w-4 h-px bg-white/10" />
                    </div>

                    {/* Active Indicator Dot */}
                    {!muted && mode === 'LIVE' && (
                      <div className="absolute top-2 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Mute button */}
              <button
                onClick={() => toggleMute(channel.number)}
                className={`w-full mt-1 px-1 py-1 rounded text-[8px] font-bold tracking-wider transition-all border shadow-sm ${muted
                  ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                  }`}
              >
                {muted ? 'MUTED' : 'ON'}
              </button>

              {/* Label */}
              <div className="mt-0.5 text-[8px] font-bold text-slate-500 text-center uppercase tracking-wider w-full truncate px-0.5">
                {channel.name}
              </div>
            </div>
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
