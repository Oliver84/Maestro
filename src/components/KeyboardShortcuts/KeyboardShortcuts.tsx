import React, { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';

interface Shortcut {
    key: string;
    description: string;
    category: string;
}

const shortcuts: Shortcut[] = [
    { key: 'Space', description: 'Fire selected cue (GO)', category: 'Playback' },
    { key: 'Esc', description: 'Panic - Stop all audio', category: 'Playback' },
    { key: '↑', description: 'Select previous cue', category: 'Navigation' },
    { key: '↓', description: 'Select next cue', category: 'Navigation' },
    { key: 'Enter', description: 'Fire selected cue', category: 'Playback' },
    { key: '?', description: 'Toggle this help overlay', category: 'General' },
    { key: 'Cmd+Shift+P', description: 'Toggle performance metrics', category: 'General' },
    { key: 'Cmd+Shift+M', description: 'Toggle performance metrics (alt)', category: 'General' },
    { key: 'Cmd+S', description: 'Save show (auto-save enabled)', category: 'General' },
    { key: 'Cmd+O', description: 'Open settings', category: 'General' },
    { key: 'Delete', description: 'Delete selected cue', category: 'Editing' },
];

export const KeyboardShortcuts: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Toggle with '?' key (Shift + /)
            if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            // Close with Escape
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isOpen]);

    if (!isOpen) return null;

    const categories = Array.from(new Set(shortcuts.map(s => s.category)));

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <Keyboard className="text-emerald-400" size={24} />
                        <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {categories.map(category => (
                        <div key={category}>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                                {category}
                            </h3>
                            <div className="space-y-2">
                                {shortcuts
                                    .filter(s => s.category === category)
                                    .map((shortcut, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                        >
                                            <span className="text-slate-300 text-sm">
                                                {shortcut.description}
                                            </span>
                                            <kbd className="px-3 py-1.5 text-xs font-bold text-white bg-slate-950 border border-slate-700 rounded shadow-sm min-w-[60px] text-center">
                                                {shortcut.key}
                                            </kbd>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                    <p className="text-xs text-slate-500 text-center">
                        Press <kbd className="px-2 py-0.5 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded">?</kbd> anytime to toggle this overlay
                    </p>
                </div>
            </div>
        </div>
    );
};
