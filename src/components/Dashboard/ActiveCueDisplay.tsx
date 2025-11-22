import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ActiveCueDisplay: React.FC = () => {
    const { cues, activeCueId } = useAppStore();
    const activeCue = cues.find(c => c.id === activeCueId);

    return (
        <div className="flex flex-col items-center py-6 text-center relative w-full h-[420px]">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <h3 className="text-slate-500 font-bold tracking-[0.2em] text-xs uppercase mb-8 z-10">Current Cue</h3>

            <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
                {activeCue ? (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-baseline gap-3 mb-2">
                            <span className="text-4xl font-black text-amber-500 tracking-tighter opacity-80">CUE</span>
                            <span className="text-8xl font-black text-amber-400 tracking-tighter leading-none">{activeCue.sequence}</span>
                        </div>

                        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight max-w-md leading-tight px-4 line-clamp-2 h-[3.5rem] flex items-center justify-center">
                            {activeCue.title}
                        </h1>

                        {/* Scene Name */}
                        <div className="h-8 flex items-center">
                            {activeCue.scene && (
                                <div className="text-emerald-400 font-bold tracking-widest uppercase text-xs bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-500/20">
                                    {activeCue.scene}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="opacity-20 flex flex-col items-center justify-center h-full">
                        <div className="text-6xl font-black text-slate-700 mb-4">--</div>
                        <div className="text-lg font-medium text-slate-500 uppercase tracking-widest">Standby</div>
                    </div>
                )}
            </div>
        </div>
    );
};
