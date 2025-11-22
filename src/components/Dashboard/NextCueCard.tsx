import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Play } from 'lucide-react';

export const NextCueCard: React.FC = () => {
    const { cues, activeCueId, selectedCueId, fireCue } = useAppStore();

    // Determine which cue is "Next" / "Selected"
    // If selectedCueId is set manually, use that.
    // Otherwise, auto-calculate based on active.
    let targetCueId = selectedCueId;

    if (!targetCueId) {
        const activeIndex = cues.findIndex(c => c.id === activeCueId);
        if (activeIndex !== -1 && activeIndex < cues.length - 1) {
            targetCueId = cues[activeIndex + 1].id;
        } else if (activeCueId === null && cues.length > 0) {
            targetCueId = cues[0].id;
        }
    }

    const targetCue = cues.find(c => c.id === targetCueId);

    const handleGo = () => {
        if (targetCueId) {
            fireCue(targetCueId);
        }
    };

    return (
        <button
            onClick={handleGo}
            className={`w-full bg-slate-900 rounded-xl p-0 border border-slate-800 shadow-lg flex flex-col min-h-[140px] group transition-all duration-200 relative overflow-hidden text-left hover:border-emerald-500/50 hover:shadow-emerald-900/20 ${!targetCue ? 'opacity-50 cursor-default' : 'cursor-pointer active:scale-[0.99]'}`}
            disabled={!targetCue}
        >
            {/* "GO" Label Background Effect */}
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-emerald-900/20 to-transparent pointer-events-none" />

            <div className="p-5 flex-1 flex flex-col justify-center z-10">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-slate-500 font-bold tracking-wider text-xs uppercase group-hover:text-emerald-400 transition-colors">Next Cue</h3>
                    {targetCue && <span className="bg-slate-800 text-emerald-500 font-bold text-xs px-2 py-1 rounded border border-slate-700">SQ {targetCue.sequence}</span>}
                </div>

                {targetCue ? (
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-black text-white tracking-tight truncate pr-4 group-hover:text-emerald-100 transition-colors">
                            {targetCue.title}
                        </h2>
                        <div className="bg-emerald-600 text-white p-3 rounded-full shadow-lg group-hover:bg-emerald-500 transition-colors transform group-hover:scale-110 duration-200">
                            <Play size={24} fill="currentColor" />
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-600 italic text-lg">End of Show</div>
                )}
            </div>

            {/* Hint for Keyboard */}
            {targetCue && (
                <div className="bg-slate-950/50 px-5 py-1.5 border-t border-slate-800/50 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>SPACEBAR TO GO</span>
                    <span>↑/↓ SELECT</span>
                </div>
            )}
        </button>
    );
};
