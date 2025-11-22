import React from 'react';
import { Plus } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAppStore } from '../../store/useAppStore';
import { CueList } from './CueList';
import { QuickMix } from './QuickMix';

export const Sidebar: React.FC = () => {
    const { addCue } = useAppStore();

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
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <h2 className="font-bold text-sm uppercase tracking-wider text-slate-400">Cue List</h2>
                <button
                    onClick={handleAddCue}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="Add Cue"
                >
                    <Plus size={18} />
                </button>
            </div>
            <PanelGroup direction="vertical" className="flex-1">
                <Panel defaultSize={70} minSize={30}>
                    <div className="h-full overflow-hidden">
                        <CueList />
                    </div>
                </Panel>
                <PanelResizeHandle className="h-1 bg-slate-800 hover:bg-emerald-500/50 transition-colors cursor-row-resize" />
                <Panel defaultSize={30} minSize={15} maxSize={50}>
                    <QuickMix />
                </Panel>
            </PanelGroup>
        </div>
    );
};
