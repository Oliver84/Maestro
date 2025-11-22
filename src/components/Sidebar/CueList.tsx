import React, { useState, DragEvent, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Music, Trash2, X, Layers, StopCircle } from 'lucide-react';
import { InlineWaveform } from './InlineWaveform';
import { AudioEngine } from '../../services/AudioEngine';

export const CueList: React.FC = () => {
    const { cues, fireCue, addCue, updateCue, deleteCue, selectedCueId, selectCue, activeCueId, lastFiredAt } = useAppStore();
    const [isDraggingOverList, setIsDraggingOverList] = useState(false);
    const [dragOverCueId, setDragOverCueId] = useState<string | null>(null);
    const [editingCueId, setEditingCueId] = useState<string | null>(null);
    const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
    const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
    const [playingCueIds, setPlayingCueIds] = useState<Set<string>>(new Set());
    const cueRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
    const lastActiveCueChangeTime = useRef(0);

    // Track which cues are actually playing audio
    useEffect(() => {
        const updatePlayingCues = () => {
            const activeSounds = AudioEngine.getActiveSounds();
            const playingIds = new Set(activeSounds.map(sound => sound.cueId));
            setPlayingCueIds(playingIds);
            requestAnimationFrame(updatePlayingCues);
        };
        const animationId = requestAnimationFrame(updatePlayingCues);
        return () => cancelAnimationFrame(animationId);
    }, []);

    // Auto-scroll to active cue when it starts
    useEffect(() => {
        if (activeCueId) {
            lastActiveCueChangeTime.current = Date.now();
            // Use setTimeout to ensure DOM has updated
            setTimeout(() => {
                const element = cueRefs.current.get(activeCueId);
                if (element) {
                    console.log('[CueList] Auto-scrolling to active cue:', activeCueId);
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
        }
    }, [activeCueId, lastFiredAt]);

    // Auto-scroll to selected cue
    useEffect(() => {
        if (selectedCueId) {
            // If active cue changed recently (e.g. due to firing), don't scroll to selection (auto-advance)
            // This allows the user to see the active cue when it starts
            const timeSinceActiveCueChange = Date.now() - lastActiveCueChangeTime.current;
            if (timeSinceActiveCueChange < 250) {
                console.log('[CueList] Skipping scroll to selected cue (active cue changed recently)');
                return;
            }

            // Use setTimeout to ensure DOM has updated
            setTimeout(() => {
                const element = cueRefs.current.get(selectedCueId);
                if (element) {
                    console.log('[CueList] Auto-scrolling to selected cue:', selectedCueId);
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
        }
    }, [selectedCueId]);


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

    const togglePlaybackMode = (e: React.MouseEvent, id: string, currentMode?: 'STOP_AND_GO' | 'OVERLAP') => {
        e.stopPropagation();
        const newMode = currentMode === 'OVERLAP' ? 'STOP_AND_GO' : 'OVERLAP';
        updateCue(id, { playbackMode: newMode });
    };

    // Helper to extract filename from path
    const getFilename = (path: string) => {
        // Handle both Windows (\) and Unix (/) separators
        const name = path.split(/[/\\]/).pop();
        return name || path;
    };

    // Prevent cue firing when clicking on inputs
    const stopProp = (e: React.MouseEvent) => e.stopPropagation();

    // Handle Row Click: Selects the cue (for Go logic) and fires if needed (double click? or just separate selection)
    // Standard Show Control: Click selects (Blue). Spacebar Fires (Green).
    // But we also kept the "Click to Fire" logic in previous steps.
    // Let's make Click -> Select. Double Click -> Fire? Or keep single click fire but update selection?
    // The user requested "Navigate up/down... space bar to go".
    // Usually, clicking a row should SELECT it (Next).
    const handleRowClick = (id: string) => {
        if (!editingCueId && !editingSnippetId && !editingSceneId) {
            selectCue(id);
        }
    };

    return (
        <div
            className={`h-full overflow-y-auto transition-colors ${isDraggingOverList ? 'bg-slate-800/50 ring-2 ring-emerald-500/50' : 'bg-slate-900/30'}`}
            onDragOver={handleDragOverList}
            onDragLeave={handleDragLeaveList}
            onDrop={handleDropOnList}
        >
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-3 py-2 border-b border-slate-800 w-12 text-center">#</th>
                        <th className="px-4 py-2 border-b border-slate-800">Description</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {cues.map((cue) => {
                        // Active if it's the currently fired cue OR if it's playing audio (e.g. overlap)
                        const isActive = activeCueId === cue.id || playingCueIds.has(cue.id);
                        const isSelected = selectedCueId === cue.id; // Selected/Next
                        const isDragTarget = dragOverCueId === cue.id;
                        const isEditingTitle = editingCueId === cue.id;
                        const isEditingSnippet = editingSnippetId === cue.id;
                        const isEditingScene = editingSceneId === cue.id;

                        // Logic for type display
                        let type = 'CUE';
                        const hasSnippet = cue.snippetId !== null && cue.snippetId !== undefined;

                        if (cue.audioFilePath && hasSnippet) type = 'MIXED';
                        else if (cue.audioFilePath) type = 'SONG';
                        else if (hasSnippet) type = 'SNIPPET';

                        const typeColor = type === 'SONG' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                            type === 'SNIPPET' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                                type === 'MIXED' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                    'bg-slate-700/20 text-slate-400 border-slate-700/30';

                        const isOverlap = cue.playbackMode === 'OVERLAP';

                        return (
                            <tr
                                key={cue.id}
                                ref={(el) => {
                                    if (el) {
                                        cueRefs.current.set(cue.id, el);
                                    } else {
                                        cueRefs.current.delete(cue.id);
                                    }
                                }}
                                className={`group transition-all cursor-pointer border-l-4 duration-200
                                    ${isActive ? 'bg-emerald-900/30 border-emerald-500 shadow-lg shadow-emerald-500/10' :
                                        isSelected ? 'bg-blue-900/20 border-blue-500' :
                                            'hover:bg-slate-800/40 border-transparent'}
                                    ${isDragTarget ? '!bg-emerald-900/30 ring-2 ring-emerald-500/50' : ''}
                                `}
                                onClick={() => handleRowClick(cue.id)}
                                onDoubleClick={() => fireCue(cue.id)}
                                onDragOver={(e) => handleDragOverRow(e, cue.id)}
                                onDragLeave={handleDragLeaveRow}
                                onDrop={(e) => handleDropOnRow(e, cue.id)}
                            >
                                <td className="px-3 py-2 font-mono text-slate-400 group-hover:text-amber-400 text-xl font-black text-center transition-colors">
                                    {cue.sequence}
                                </td>
                                <td className="px-4 py-2" onClick={stopProp}>
                                    {isEditingTitle ? (
                                        <input
                                            autoFocus
                                            className="bg-slate-950 text-white font-bold text-base px-2 py-0.5 rounded border border-emerald-500 outline-none w-full"
                                            value={cue.title}
                                            onChange={(e) => updateCue(cue.id, { title: e.target.value })}
                                            onBlur={() => setEditingCueId(null)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') setEditingCueId(null);
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className={`font-bold text-base cursor-text hover:text-emerald-400 transition-colors leading-tight ${isActive ? 'text-white' : 'text-slate-100'}`}
                                            onClick={() => setEditingCueId(cue.id)}
                                            title="Click to edit title"
                                        >
                                            {cue.title}
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                        {/* Scene Name Edit */}
                                        <div className="text-xs text-slate-400 cursor-text hover:text-emerald-400 italic" onClick={() => setEditingSceneId(cue.id)}>
                                            {isEditingScene ? (
                                                <input
                                                    autoFocus
                                                    className="bg-slate-950 text-slate-300 px-1 py-0.5 rounded border border-emerald-500 outline-none w-32"
                                                    placeholder="Scene Name"
                                                    value={cue.scene || ''}
                                                    onChange={(e) => updateCue(cue.id, { scene: e.target.value })}
                                                    onBlur={() => setEditingSceneId(null)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingSceneId(null); }}
                                                />
                                            ) : (
                                                cue.scene || "Click to set scene"
                                            )}
                                        </div>

                                        {/* Controls Row: Audio Filename + Playback Mode + Snippet + Type + Actions */}
                                        <div className="flex items-center justify-between gap-2 mt-0.5">
                                            {/* Left: Audio Filename */}
                                            {cue.audioFilePath && (
                                                <div className="flex items-center gap-1 text-xs text-emerald-300/70 font-mono bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-900/30 w-fit">
                                                    <Music size={11} />
                                                    <span className="truncate max-w-[200px]" title={cue.audioFilePath}>
                                                        {getFilename(cue.audioFilePath)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Right: All Pills with Fixed Widths */}
                                            <div className="flex items-center gap-1.5 ml-auto">
                                                {/* Playback Mode Indicator */}
                                                <button
                                                    className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors font-semibold w-[90px] justify-center ${isOverlap ? 'border-blue-500/40 text-blue-300 bg-blue-500/15 hover:bg-blue-500/25' : 'border-slate-700 text-slate-400 bg-slate-800/50 hover:bg-slate-700'}`}
                                                    onClick={(e) => togglePlaybackMode(e, cue.id, cue.playbackMode)}
                                                    title={isOverlap ? "Mode: Overlap (Plays on top)" : "Mode: Stop & Go (Stops previous audio)"}
                                                >
                                                    {isOverlap ? <Layers size={11} /> : <StopCircle size={11} />}
                                                    <span>{isOverlap ? 'LAYER' : 'STOP & GO'}</span>
                                                </button>

                                                {/* Snippet - Inline */}
                                                {isEditingSnippet ? (
                                                    <input
                                                        autoFocus
                                                        type="number"
                                                        className="bg-slate-950 text-white px-2 py-0.5 rounded border border-emerald-500 outline-none w-12 text-xs text-center"
                                                        placeholder="#"
                                                        value={cue.snippetId ?? ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            updateCue(cue.id, { snippetId: val === '' ? null : parseInt(val) });
                                                        }}
                                                        onBlur={() => setEditingSnippetId(null)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') setEditingSnippetId(null); }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="text-xs text-slate-400 italic cursor-text hover:text-emerald-400 border border-transparent hover:border-slate-700 rounded px-2 py-0.5 w-12 text-center"
                                                        onClick={() => setEditingSnippetId(cue.id)}
                                                        title="Snippet ID"
                                                    >
                                                        {cue.snippetId !== null && cue.snippetId !== undefined ? `#${cue.snippetId}` : '-'}
                                                    </div>
                                                )}

                                                {/* Type Badge */}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeColor} w-[60px] text-center`}>
                                                    {type}
                                                </span>

                                                {/* Actions - Inline */}
                                                <div className="flex items-center gap-1">
                                                    <div className="relative flex items-center">
                                                        <button
                                                            className={`p-1.5 rounded-md transition-colors ${cue.audioFilePath ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700'}`}
                                                            onClick={(e) => handleAudioSelect(e, cue.id)}
                                                            title={cue.audioFilePath ? "Change audio file" : "Add audio file"}
                                                        >
                                                            <Music size={14} />
                                                        </button>
                                                        {cue.audioFilePath && (
                                                            <button
                                                                className="absolute -top-0.5 -right-0.5 bg-slate-900 text-slate-400 hover:text-red-400 rounded-full p-0.5 border border-slate-700"
                                                                onClick={(e) => handleRemoveAudio(e, cue.id)}
                                                                title="Remove audio"
                                                            >
                                                                <X size={8} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <button
                                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                                                        onClick={(e) => handleDelete(e, cue.id)}
                                                        title="Delete cue"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Inline Waveform Progress - Always shown if audio file exists */}
                                        {cue.audioFilePath && (
                                            <div className="mt-1.5">
                                                <InlineWaveform
                                                    cueId={cue.id}
                                                    audioFilePath={cue.audioFilePath}
                                                    isActive={isActive}
                                                />
                                            </div>
                                        )}
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
