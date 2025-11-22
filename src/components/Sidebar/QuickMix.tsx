import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getOscClient } from '../../services/OscClient';
import { throttle } from '../../utils/throttle';

export const QuickMix: React.FC = () => {
  const { x32Channels, selectedChannelIds, settings, updateChannelFader, updateChannelMute } = useAppStore();
  const [dragging, setDragging] = useState<number | null>(null);
  const faderRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const oscClient = useMemo(() => getOscClient(), []);

  // Get selected channels from store
  const displayChannels = x32Channels.filter(ch =>
    selectedChannelIds.includes(ch.number)
  );

  // Create throttled OSC send functions (50ms throttle)
  const throttledSendFader = useMemo(
    () => throttle((channelNum: number, level: number) => {
      if (!settings.simulationMode) {
        oscClient.setChannelFader(channelNum, level);
      }
    }, 50),
    [settings.simulationMode, oscClient]
  );

  const handleLevelChange = (channelNum: number, newLevel: number) => {
    // Update store immediately for responsive UI
    updateChannelFader(channelNum, newLevel);

    // Send OSC command (throttled)
    throttledSendFader(channelNum, newLevel);

    console.log(`[QuickMix] Channel ${channelNum} fader: ${newLevel.toFixed(2)}`);
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
    const channel = x32Channels.find(ch => ch.number === channelNum);
    if (channel) {
      const newMutedState = !channel.muted;
      updateChannelMute(channelNum, newMutedState);

      // Send OSC command (no throttling needed for mute)
      if (!settings.simulationMode) {
        oscClient.setChannelMute(channelNum, newMutedState);
      }

      console.log(`[QuickMix] Channel ${channelNum} mute: ${newMutedState ? 'MUTED' : 'ON'}`);
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
    <div className="border-t border-slate-800 bg-slate-950/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Volume2 size={12} />
          Quick Mix
        </h3>
        {settings.simulationMode ? (
          <span className="text-[9px] text-amber-500 font-bold">Simulation</span>
        ) : (
          <span className="text-[9px] text-emerald-500 font-bold">Connected</span>
        )}
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(48px, 1fr))' }}>
        {displayChannels.map((channel) => (
          <div key={channel.number} className="flex flex-col items-center gap-1.5">
            {/* Level display */}
            <div className="text-[9px] font-mono text-slate-500 font-bold">
              {channel.faderLevel.toFixed(2)}
            </div>

            {/* Fader track container */}
            <div
              ref={el => faderRefs.current[channel.number] = el}
              className="relative w-12 h-24 bg-slate-900/80 rounded border border-slate-800 shadow-inner cursor-pointer select-none overflow-hidden"
              onMouseDown={(e) => handleMouseDown(channel.number, e)}
            >
              {/* Fill */}
              <div
                className={`absolute bottom-0 left-0 right-0 rounded ${channel.muted
                  ? 'bg-slate-700/50'
                  : 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                  }`}
                style={{
                  height: `${Math.max(channel.faderLevel * 100, 0)}%`,
                }}
              />
            </div>

            {/* Draggable slider handle - overlay */}
            <div className="relative w-12 h-24 -mt-24 pointer-events-none mb-3">
              <div
                className={`absolute left-1/2 -translate-x-1/2 w-10 h-6 rounded transition-transform ${channel.muted
                  ? 'bg-slate-600/90 border-2 border-slate-500'
                  : 'bg-slate-700/90 border-2 border-emerald-400/70 shadow-lg'
                  } ${dragging === channel.number ? 'scale-105' : ''}`}
                style={{
                  bottom: `calc(${channel.faderLevel * 100}% - 12px)`,
                }}
              />
            </div>

            {/* Mute button */}
            <button
              onClick={() => toggleMute(channel.number)}
              className={`w-12 px-1.5 py-0.5 rounded text-[8px] font-bold transition-all ${channel.muted
                ? 'bg-red-900/60 text-red-200 border border-red-800/50'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:bg-slate-700'
                }`}
            >
              {channel.muted ? 'MUTE' : 'ON'}
            </button>

            {/* Label */}
            <div className="text-[8px] font-bold text-slate-500 text-center uppercase tracking-wider w-full break-words leading-tight px-0.5">
              {channel.name}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800/50">
        <div className="text-[8px] text-slate-600 text-center font-mono">
          {settings.simulationMode ? 'SIMULATION MODE' : 'LOG'}
        </div>
      </div>
    </div>
  );
};
