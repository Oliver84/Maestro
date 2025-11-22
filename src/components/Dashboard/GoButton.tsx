import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Play } from 'lucide-react';

export const GoButton: React.FC = () => {
    const { cues, activeCueId, selectedCueId, fireCue } = useAppStore();

    // Determine which cue is "Next" / "Selected"
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
            className={`w-full rounded-2xl shadow-[0_0_50px_-10px_rgba(16,185,129,0.3)] border border-emerald-500/30 flex flex-col min-h-[160px] group transition-all duration-200 relative overflow-hidden text-left
            ${!targetCue
                ? 'bg-slate-900 opacity-50 cursor-default'
                : 'bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 active:scale-[0.98] cursor-pointer'
            }`}
            disabled={!targetCue}
        >
            {/* Background GO Text */}
            <div className="absolute -right-4 -bottom-8 text-[150px] font-black text-black/10 pointer-events-none select-none leading-none">
                GO
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between z-10 h-full">
                {/* Top Row: Label & Number */}
                <div className="flex justify-between items-start w-full">
                    <h3 className="text-emerald-200/70 font-bold tracking-[0.2em] text-xs uppercase">Next Cue</h3>
                    {targetCue && (
                        <div className="bg-black/30 text-emerald-400 font-black text-xl px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                            {targetCue.sequence}
                        </div>
                    )}
                </div>

                {/* Center: Title */}
                <div className="flex items-center gap-4 mt-2">
                    {targetCue ? (
                        <>
                            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                                <Play size={32} fill="white" className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-3xl font-black text-white tracking-tight truncate leading-none">
                                    {targetCue.title}
                                </h2>
                                {targetCue.scene && (
                                    <div className="text-emerald-200 text-sm font-medium mt-1 uppercase tracking-wide opacity-80">
                                        {targetCue.scene}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-slate-400 italic text-xl font-medium">End of Show</div>
                    )}
                </div>

                {/* Bottom: Shortcuts */}
                {targetCue && (
                    <div className="mt-4 flex gap-4 text-[10px] font-bold text-emerald-200/60 uppercase tracking-wider">
                        <span className="bg-black/20 px-2 py-1 rounded">Spacebar</span>
                        <span className="bg-black/20 px-2 py-1 rounded">↑/↓ Select</span>
                    </div>
                )}
            </div>
        </button>
    );
};
