import React, { memo, useState, useEffect, forwardRef } from 'react';
import { faderToDb, dbToFader } from '../../utils/audioMath';

interface FaderValueInputProps {
    level: number;
    onCommit: (newLevel: number) => void;
    mode: 'LIVE' | 'EDIT';
}

const FaderValueInput: React.FC<FaderValueInputProps> = ({ level, onCommit, mode }) => {
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

export interface ChannelStripProps {
    channelNumber: number;
    name: string;
    level: number;
    muted: boolean;
    meterValue: number;
    mode: 'LIVE' | 'EDIT';
    debug: boolean;
    onLevelChange: (channelNum: number, newLevel: number) => void;
    onMuteToggle: (channelNum: number) => void;
    onMouseDown: (channelNum: number, e: React.MouseEvent) => void;
}

// ForwardRef to handle ref stability properly
export const ChannelStrip = memo(forwardRef<HTMLDivElement, ChannelStripProps>(({
    channelNumber,
    name,
    level,
    muted,
    meterValue,
    mode,
    debug,
    onLevelChange,
    onMuteToggle,
    onMouseDown,
}, ref) => {
    return (
        <div className="flex flex-col items-center gap-0.5 snap-start min-w-[50px] flex-1">
            {/* Header: Number & Level */}
            <div className="flex flex-col items-center gap-0.5 mb-1 w-full">
                {/* Channel Number Badge */}
                <div className={`flex items-center justify-center w-4 h-4 rounded border shadow-sm transition-colors ${muted
                    ? 'bg-slate-950 border-slate-900'
                    : 'bg-slate-800 border-slate-700'
                    }`}>
                    <span className={`text-[9px] font-black ${muted ? 'text-slate-700' : 'text-slate-300'}`}>{channelNumber}</span>
                </div>

                {/* Level Value Input */}
                <FaderValueInput
                    level={level}
                    onCommit={(newLevel) => onLevelChange(channelNumber, newLevel)}
                    mode={mode}
                />

                {/* Debug Indicator (Only visible if debug mode is on) */}
                {debug && (
                    <div className="absolute top-0 right-0 w-1 h-1 bg-red-500 rounded-full" title="Debug On" />
                )}
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
                            height: `${Math.min(meterValue * 100, 100)}%`,
                            marginTop: `${100 - Math.min(meterValue * 100, 100)}%`
                        }}
                    />
                </div>

                {/* Fader Track Area */}
                <div
                    className="relative w-8 h-full flex justify-center group"
                    ref={ref}
                    onMouseDown={(e) => onMouseDown(channelNumber, e)}
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
                onClick={() => onMuteToggle(channelNumber)}
                className={`w-full mt-1 px-1 py-1 rounded text-[8px] font-bold tracking-wider transition-all border shadow-sm ${muted
                    ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                    }`}
            >
                {muted ? 'MUTED' : 'ON'}
            </button>

            {/* Label */}
            <div className="mt-0.5 text-[8px] font-bold text-slate-500 text-center uppercase tracking-wider w-full truncate px-0.5">
                {name}
            </div>
        </div>
    );
}));
