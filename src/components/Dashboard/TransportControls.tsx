import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Square } from 'lucide-react';

export const TransportControls: React.FC = () => {
    const { cues, activeCueId, fireCue, stopAll } = useAppStore();

    const handleGo = () => {
        const activeIndex = cues.findIndex(c => c.id === activeCueId);
        let nextCueId: string | null = null;

        if (activeCueId === null && cues.length > 0) {
            nextCueId = cues[0].id;
        } else if (activeIndex !== -1 && activeIndex < cues.length - 1) {
            nextCueId = cues[activeIndex + 1].id;
        }

        if (nextCueId) {
            fireCue(nextCueId);
        }
    };

    // Global Spacebar Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
                e.preventDefault();
                handleGo();
            }
            if (e.code === 'Escape') {
                stopAll();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cues, activeCueId, fireCue, stopAll]);

    return (
        <div className="mt-8 flex items-center gap-3">
            {/* Horizontal GO Button */}
            <button
                onClick={handleGo}
                className="flex-1 h-16 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:from-emerald-700 active:to-emerald-600 text-white rounded-2xl shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)] border border-emerald-400/20 flex items-center justify-center gap-4 transition-all transform active:scale-[0.98] group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-5xl font-black tracking-tighter drop-shadow-md z-10">GO</span>
                <span className="text-xs font-bold tracking-[0.2em] text-emerald-900/60 uppercase bg-emerald-700/30 px-3 py-1.5 rounded-lg z-10">Space</span>
            </button>

            {/* Panic Button */}
            <button
                onClick={stopAll}
                className="w-16 h-16 bg-slate-900 hover:bg-red-950/30 text-slate-500 hover:text-red-500 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 transition-colors border border-slate-800 hover:border-red-900/50"
                title="Panic / Stop All (Esc)"
            >
                <Square size={20} fill="currentColor" className="opacity-50" />
                <span className="text-[8px] tracking-wider uppercase">Panic</span>
            </button>
        </div>
    );
};
