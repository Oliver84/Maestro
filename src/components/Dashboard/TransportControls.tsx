import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Square } from 'lucide-react';

export const TransportControls: React.FC = () => {
    const { stopAll } = useAppStore();

    return (
        <button
            onClick={stopAll}
            className="w-full aspect-square bg-slate-900/50 hover:bg-red-950/30 text-slate-500 hover:text-red-500 rounded-2xl font-bold flex flex-col items-center justify-center gap-1.5 transition-colors border border-slate-800 hover:border-red-900/50 group shadow-lg"
            title="Panic / Stop All (Esc)"
        >
            <Square size={20} fill="currentColor" className="opacity-50 group-hover:opacity-100 transition-opacity" />
            <span className="text-[10px] tracking-widest uppercase font-black">Panic</span>
            <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 group-hover:text-red-400/60 font-mono">ESC</span>
        </button>
    );
};
