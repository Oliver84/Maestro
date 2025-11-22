import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ActiveCueDisplay: React.FC = () => {
    const { cues, activeCueId } = useAppStore();
    const activeCue = cues.find(c => c.id === activeCueId);

    return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <h3 className="text-slate-500 font-bold tracking-[0.2em] text-xs uppercase mb-6">Current Cue</h3>

            {activeCue ? (
                <>
                    <div className="flex items-baseline gap-4 mb-4">
                        <span className="text-7xl font-black text-amber-400 tracking-tighter">SQ</span>
                        <span className="text-9xl font-black text-amber-400 tracking-tighter">{activeCue.sequence}</span>
                    </div>

                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight max-w-md leading-tight">
                        {activeCue.title}
                    </h1>

                    <div className="text-slate-400 font-medium italic mt-4">
                        "Start of Production"
                    </div>
                </>
            ) : (
                <div className="opacity-30 flex flex-col items-center">
                    <div className="text-8xl font-black text-slate-700 mb-4">--</div>
                    <div className="text-xl font-light text-slate-500">Standby</div>
                </div>
            )}
        </div>
    );
};
