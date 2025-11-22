import React, { useState, DragEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Music, Trash2, X } from 'lucide-react';

export const CueList: React.FC = () => {
    const { cues, activeCueId, fireCue, addCue, updateCue, deleteCue } = useAppStore();
    const [isDraggingOverList, setIsDraggingOverList] = useState(false);
    const [dragOverCueId, setDragOverCueId] = useState<string | null>(null);
    const [editingCueId, setEditingCueId] = useState<string | null>(null);

    const handleDragOverList = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOverList(true);
    };

    const handleDragLeaveList = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
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
            const file = files[0];
            if (isValidAudioFile(file)) {
                // IMPORTANT: Only update audio path, NOT the title
                updateCue(cueId, {
                    audioFilePath: (file as any).path || file.name,
                });
            }
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

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this cue?')) {
            deleteCue(id);
        }
    };

    const handleAudioSelect = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const filePath = await window.ipcRenderer.selectAudioFile();
        if (filePath) {
            updateCue(id, { audioFilePath: filePath });
        }
    };

    const handleRemoveAudio = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Remove audio from this cue?')) {
            updateCue(id, { audioFilePath: '' });
        }
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
                        <th className="px-6 py-4 border-b border-slate-800 w-24 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {cues.map((cue) => {
                        const isActive = activeCueId === cue.id;
                        const isDragTarget = dragOverCueId === cue.id;
                        const isEditing = editingCueId === cue.id;

                        const type = cue.audioFilePath ? 'SONG' : (cue.oscCommand ? 'OSC' : 'CUE');
                        const typeColor = type === 'SONG' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-amber-700/20 text-amber-500 border-amber-700/30';

                        return (
                            <tr
                                key={cue.id}
                                className={`group transition-colors cursor-pointer
                                    ${isActive ? 'bg-slate-800/80' : 'hover:bg-slate-800/30'}
                                    ${isDragTarget ? '!bg-emerald-900/30 ring-1 ring-emerald-500/50' : ''}
                                `}
                                onClick={() => !isEditing && fireCue(cue.id)}
                                onDragOver={(e) => handleDragOverRow(e, cue.id)}
                                onDragLeave={handleDragLeaveRow}
                                onDrop={(e) => handleDropOnRow(e, cue.id)}
                            >
                                <td className="px-6 py-4 font-mono text-slate-400 group-hover:text-slate-200 text-lg">
                                    SQ {cue.sequence}
                                </td>
                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                    {isEditing ? (
                                        <input
                                            autoFocus
                                            className="bg-slate-950 text-white font-bold text-lg px-2 py-1 rounded border border-emerald-500 outline-none w-full"
                                            value={cue.title}
                                            onChange={(e) => updateCue(cue.id, { title: e.target.value })}
                                            onBlur={() => setEditingCueId(null)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') setEditingCueId(null);
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className={`font-bold text-lg cursor-text hover:text-emerald-400 transition-colors ${isActive ? 'text-white' : 'text-slate-200'}`}
                                            onClick={() => setEditingCueId(cue.id)}
                                            title="Click to edit title"
                                        >
                                            {cue.title}
                                        </div>
                                    )}
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
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="relative flex items-center">
                                            <button
                                                className={`p-2 rounded-md transition-colors ${cue.audioFilePath ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700'}`}
                                                onClick={(e) => handleAudioSelect(e, cue.id)}
                                                title={cue.audioFilePath ? "Change audio file" : "Add audio file"}
                                            >
                                                <Music size={16} />
                                            </button>
                                            {cue.audioFilePath && (
                                                <button
                                                    className="absolute -top-1 -right-1 bg-slate-900 text-slate-400 hover:text-red-400 rounded-full p-0.5 border border-slate-700"
                                                    onClick={(e) => handleRemoveAudio(e, cue.id)}
                                                    title="Remove audio"
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                                            onClick={(e) => handleDelete(e, cue.id)}
                                            title="Delete cue"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
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
