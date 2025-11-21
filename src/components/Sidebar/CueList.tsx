import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const CueList: React.FC = () => {
    const { cues, activeCueId, fireCue } = useAppStore();

    return (
        <div className="flex-1 overflow-y-auto bg-slate-900/30">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-6 py-4 border-b border-slate-800 w-20">Cue #</th>
                        <th className="px-6 py-4 border-b border-slate-800">Description</th>
                        <th className="px-6 py-4 border-b border-slate-800 w-1/3">Trigger / Script Context</th>
                        <th className="px-6 py-4 border-b border-slate-800 w-32 text-right">Type</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {cues.map((cue) => {
                        const isActive = activeCueId === cue.id;
                        const type = cue.audioFilePath ? 'SONG' : (cue.oscCommand ? 'OSC' : 'CUE');
                        const typeColor = type === 'SONG' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-amber-700/20 text-amber-500 border-amber-700/30';

                        return (
                            <tr
                                key={cue.id}
                                className={`group transition-colors cursor-pointer ${isActive ? 'bg-slate-800/80' : 'hover:bg-slate-800/30'}`}
                                onClick={() => fireCue(cue.id)}
                            >
                                <td className="px-6 py-4 font-mono text-slate-400 group-hover:text-slate-200 text-lg">
                                    SQ {cue.sequence}
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`font-bold text-lg ${isActive ? 'text-white' : 'text-slate-200'}`}>
                                        {cue.title}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Scene 1
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-400 italic font-serif">
                                    "Start of Production"
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${typeColor}`}>
                                        {type}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {cues.length === 0 && (
                <div className="p-12 text-center text-slate-600">
                    <div className="text-4xl mb-4 opacity-20">📭</div>
                    <p>No cues in the show file.</p>
                </div>
            )}
        </div>
    );
};
