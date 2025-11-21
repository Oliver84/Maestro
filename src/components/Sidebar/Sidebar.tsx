import React from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { CueList } from './CueList';
import { QuickMix } from './QuickMix';

export const Sidebar: React.FC = () => {
    const { addCue } = useAppStore();

    const handleAddCue = () => {
        addCue({
            title: 'New Cue',
            oscCommand: '/action/gosnippet 1',
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
            <CueList />
            <QuickMix />
        </div>
    );
};
