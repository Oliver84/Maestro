import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Square } from 'lucide-react';

export const TransportControls: React.FC = () => {
    const { stopAll } = useAppStore();

    return (
        <div className="mt-6 flex justify-center">
            {/* Panic Button Only */}
            <button
                onClick={stopAll}
                className="w-full h-14 bg-slate-900/50 hover:bg-red-950/30 text-slate-500 hover:text-red-500 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors border border-slate-800 hover:border-red-900/50 group"
                title="Panic / Stop All (Esc)"
            >
                <Square size={18} fill="currentColor" className="opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs tracking-[0.2em] uppercase">Panic / Stop All</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500 group-hover:text-red-400/60">ESC</span>
            </button>
        </div>
    );
};
