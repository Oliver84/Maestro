import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Pause, Play } from 'lucide-react';

export const TransportControls: React.FC = () => {
    const { panic, isPaused, stopAll, resetShowTimer } = useAppStore();

    const handleClick = (e: React.MouseEvent) => {
        if (e.shiftKey) {
            stopAll();
            resetShowTimer();
        } else {
            panic();
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`w-full aspect-square rounded-2xl font-bold flex flex-col items-center justify-center gap-1.5 transition-colors border group shadow-lg
                ${isPaused
                    ? 'bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-500 border-emerald-900/50'
                    : 'bg-slate-900/50 hover:bg-amber-950/30 text-slate-500 hover:text-amber-500 border-slate-800 hover:border-amber-900/50'
                }`}
            title={isPaused ? "Resume (Esc) - Shift+Click to Stop" : "Pause (Esc) - Shift+Click to Stop"}
        >
            {isPaused ? (
                <>
                    <Play size={20} fill="currentColor" className="opacity-100 transition-opacity" />
                    <span className="text-[10px] tracking-widest uppercase font-black">Resume</span>
                </>
            ) : (
                <>
                    <Pause size={20} fill="currentColor" className="opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] tracking-widest uppercase font-black">Pause</span>
                </>
            )}
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${isPaused ? 'bg-emerald-900/50 text-emerald-200' : 'bg-slate-800 text-slate-500 group-hover:text-amber-400/60'}`}>ESC</span>
        </button>
    );
};
