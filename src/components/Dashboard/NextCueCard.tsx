import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const NextCueCard: React.FC = () => {
    const { cues, activeCueId } = useAppStore();

    // Find next cue
    const activeIndex = cues.findIndex(c => c.id === activeCueId);
    const nextCue = activeIndex !== -1 && activeIndex < cues.length - 1
        ? cues[activeIndex + 1]
        : (activeCueId === null && cues.length > 0 ? cues[0] : null);

    return (
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-lg flex flex-col justify-center min-h-[120px]">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-slate-500 font-bold tracking-wider text-xs uppercase">Next Cue</h3>
                {nextCue && <span className="text-emerald-500 font-bold text-xs">SQ {nextCue.sequence}</span>}
            </div>

            {nextCue ? (
                <div className="flex items-end justify-between">
                    <h2 className="text-2xl font-bold text-white tracking-tight truncate pr-4">{nextCue.title}</h2>
                </div>
            ) : (
                <div className="text-slate-600 italic text-lg">End of Show</div>
            )}
        </div>
    );
};
