import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, FileJson, FolderOpen, Save, FilePlus } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAppStore } from '../../store/useAppStore';
import { ShowService } from '../../services/ShowService';
import { CueList } from './CueList';
import { QuickMix } from './QuickMix';

export const Sidebar: React.FC = () => {
    const { addCue, currentShowFilePath } = useAppStore();
    const [isQuickMixCollapsed, setIsQuickMixCollapsed] = useState(false);
    const [isShowMenuOpen, setIsShowMenuOpen] = useState(false);

    const handleAddCue = () => {
        addCue({
            title: 'New Cue',
            oscCommand: '',
            audioFilePath: '',
            audioVolume: 1.0
        });
    };

    return (
        <div className="flex-1 flex flex-col w-full h-full bg-transparent">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 z-20 relative">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <button
                            onClick={() => setIsShowMenuOpen(!isShowMenuOpen)}
                            className="flex items-center gap-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors border border-slate-700"
                        >
                            <FileJson size={14} />
                            <span>Show</span>
                            <ChevronDown size={12} className={`transition-transform ${isShowMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isShowMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setIsShowMenuOpen(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-40 overflow-hidden">
                                    <button
                                        onClick={() => { ShowService.newShow(); setIsShowMenuOpen(false); }}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                    >
                                        <FilePlus size={14} /> New Show
                                    </button>
                                    <button
                                        onClick={() => { ShowService.loadShow(); setIsShowMenuOpen(false); }}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                    >
                                        <FolderOpen size={14} /> Open Show...
                                    </button>
                                    <div className="h-px bg-slate-700 my-1" />
                                    <button
                                        onClick={() => { ShowService.saveShow(false); setIsShowMenuOpen(false); }}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                    >
                                        <Save size={14} /> Save
                                    </button>
                                    <button
                                        onClick={() => { ShowService.saveShow(true); setIsShowMenuOpen(false); }}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                    >
                                        <Save size={14} /> Save As...
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500">Cue List</h2>
                </div>

                <div className="flex items-center gap-2">
                    {currentShowFilePath && (
                        <span className="text-xs text-slate-500 truncate max-w-[100px]" title={currentShowFilePath}>
                            {currentShowFilePath.split(/[/\\]/).pop()}
                        </span>
                    )}
                    <button
                        onClick={handleAddCue}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        title="Add Cue"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>
            <PanelGroup direction="vertical" className="flex-1">
                <Panel defaultSize={70} minSize={30}>
                    <div className="h-full overflow-hidden">
                        <CueList />
                    </div>
                </Panel>

                {!isQuickMixCollapsed && (
                    <>
                        <PanelResizeHandle className="h-1 bg-slate-800 hover:bg-emerald-500/50 transition-colors cursor-row-resize" />
                        <Panel defaultSize={30} minSize={15} maxSize={50}>
                            <QuickMix />
                        </Panel>
                    </>
                )}
            </PanelGroup>

            {/* Collapse/Expand Toggle */}
            <button
                onClick={() => setIsQuickMixCollapsed(!isQuickMixCollapsed)}
                className="h-6 bg-slate-900 border-t border-slate-800 hover:bg-slate-800 transition-colors flex items-center justify-center text-slate-500 hover:text-emerald-400 group"
                title={isQuickMixCollapsed ? "Show Quick Mix" : "Hide Quick Mix"}
            >
                {isQuickMixCollapsed ? (
                    <ChevronUp size={16} className="transition-transform" />
                ) : (
                    <ChevronDown size={16} className="transition-transform" />
                )}
            </button>
        </div>
    );
};
