import React, { useState, useRef, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const QuickMix: React.FC = () => {
  const { x32Channels, selectedChannelIds, settings, updateChannelFader, updateChannelMute } = useAppStore();
  const [dragging, setDragging] = useState<number | null>(null);
  const faderRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Get selected channels from store
  const displayChannels = x32Channels.filter(ch =>
    selectedChannelIds.includes(ch.number)
  );

  const handleLevelChange = (channelNum: number, newLevel: number) => {
    // Update store
    updateChannelFader(channelNum, newLevel);
    // TODO: Send OSC command to update fader
    console.log(`[QuickMix] Channel ${channelNum} fader: ${newLevel}`);
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
      updateChannelMute(channelNum, !channel.muted);
      // TODO: Send OSC command to toggle mute
      console.log(`[QuickMix] Channel ${channelNum} mute toggled`);
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
    <div className="border-t border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-center justify-between mb-3">
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

      <div className="grid grid-cols-4 gap-3">
        {displayChannels.map((channel) => (
          <div key={channel.number} className="flex flex-col items-center gap-2">
            {/* Level display */}
            <div className="text-[10px] font-mono text-slate-500 font-bold">
              {channel.faderLevel.toFixed(2)}
            </div>

            {/* Fader track container */}
            <div
              ref={el => faderRefs.current[channel.number] = el}
              className="relative w-14 h-28 bg-slate-900/80 rounded-lg border border-slate-800 shadow-inner cursor-pointer select-none overflow-hidden"
              onMouseDown={(e) => handleMouseDown(channel.number, e)}
            >
              {/* Fill - rounded rectangle */}
              <div
                className={`absolute bottom-0 left-0 right-0 rounded-lg ${channel.muted
                  ? 'bg-slate-700/50'
                  : 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                  }`}
                style={{
                  height: `${Math.max(channel.faderLevel * 100, 0)}%`,
                }}
              />
            </div>

            {/* Draggable slider handle - overlay */}
            <div className="relative w-14 h-28 -mt-28 pointer-events-none">
              <div
                className={`absolute left-1/2 -translate-x-1/2 w-11 h-7 rounded-lg transition-transform ${channel.muted
                  ? 'bg-slate-600/90 border-2 border-slate-500'
                  : 'bg-slate-700/90 border-2 border-emerald-400/70 shadow-lg'
                  } ${dragging === channel.number ? 'scale-105' : ''}`}
                style={{
                  bottom: `calc(${channel.faderLevel * 100}% - 14px)`,
                }}
              />
            </div>

            {/* Mute button */}
            <button
              onClick={() => toggleMute(channel.number)}
              className={`w-14 px-2 py-1 rounded text-[9px] font-bold transition-all ${channel.muted
                ? 'bg-red-900/60 text-red-200 border border-red-800/50'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:bg-slate-700'
                }`}
            >
              {channel.muted ? 'MUTED' : 'ON'}
            </button>

            {/* Label */}
            <div className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-wider">
              {channel.name}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800/50">
        <div className="text-[8px] text-slate-600 text-center font-mono">
          {settings.simulationMode ? 'SIMULATION MODE' : 'LOG'}
        </div>
      </div>
    </div>
  );
};
