import React, { useState, DragEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const CueList: React.FC = () => {
    const { cues, activeCueId, fireCue, addCue, updateCue } = useAppStore();
    const [isDraggingOverList, setIsDraggingOverList] = useState(false);
    const [dragOverCueId, setDragOverCueId] = useState<string | null>(null);

    const handleDragOverList = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOverList(true);
    };

    const handleDragLeaveList = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // Only reset if we're leaving the container itself, not entering a child
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDraggingOverList(false);
    };

    const handleDropOnList = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOverList(false);
        setDragOverCueId(null);

        const files = Array.from(e.dataTransfer.files);
        processDroppedFiles(files);
    };

    const handleDragOverRow = (e: DragEvent<HTMLTableRowElement>, cueId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverCueId(cueId);
    };

    const handleDragLeaveRow = (e: DragEvent<HTMLTableRowElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverCueId(null);
    };

    const handleDropOnRow = (e: DragEvent<HTMLTableRowElement>, cueId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverCueId(null);
        setIsDraggingOverList(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            // Update the existing cue with the first file
            const file = files[0];
            if (isValidAudioFile(file)) {
                updateCue(cueId, {
                    audioFilePath: (file as any).path || file.name, // Fallback to name if path is missing (web), but Electron gives path
                    title: file.name
                });
            }
            // If more files were dropped, we could add them as new cues,
            // but for now let's just update the target cue with the first one.
        }
    };

    const processDroppedFiles = (files: File[]) => {
        files.forEach(file => {
            if (isValidAudioFile(file)) {
                addCue({
                    title: file.name,
                    audioFilePath: (file as any).path || file.name,
                    audioVolume: 1.0,
                    oscCommand: ''
                });
            }
        });
    };

    const isValidAudioFile = (file: File) => {
        const validExtensions = ['.mp3', '.wav', '.aac', '.m4a', '.aiff', '.flac', '.ogg'];
        return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    };

    return (
        <div
            className={`flex-1 overflow-y-auto transition-colors ${isDraggingOverList ? 'bg-slate-800/50 ring-2 ring-emerald-500/50' : 'bg-slate-900/30'}`}
            onDragOver={handleDragOverList}
            onDragLeave={handleDragLeaveList}
            onDrop={handleDropOnList}
        >
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
                        const isDragTarget = dragOverCueId === cue.id;

                        const type = cue.audioFilePath ? 'SONG' : (cue.oscCommand ? 'OSC' : 'CUE');
                        const typeColor = type === 'SONG' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-amber-700/20 text-amber-500 border-amber-700/30';

                        return (
                            <tr
                                key={cue.id}
                                className={`group transition-colors cursor-pointer
                                    ${isActive ? 'bg-slate-800/80' : 'hover:bg-slate-800/30'}
                                    ${isDragTarget ? '!bg-emerald-900/30 ring-1 ring-emerald-500/50' : ''}
                                `}
                                onClick={() => fireCue(cue.id)}
                                onDragOver={(e) => handleDragOverRow(e, cue.id)}
                                onDragLeave={handleDragLeaveRow}
                                onDrop={(e) => handleDropOnRow(e, cue.id)}
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
                <div className={`p-12 text-center text-slate-600 transition-opacity ${isDraggingOverList ? 'opacity-50' : 'opacity-100'}`}>
                    <div className="text-4xl mb-4 opacity-20">
                        {isDraggingOverList ? '📥' : '📭'}
                    </div>
                    <p>{isDraggingOverList ? 'Drop audio files here to add cues' : 'No cues in the show file.'}</p>
                </div>
            )}
        </div>
    );
};
