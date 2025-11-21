import React, { useState } from 'react';
import { Terminal } from 'lucide-react';

export const CommandLog: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="mt-auto border-t border-slate-800 pt-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors w-full"
            >
                <Terminal size={12} />
                {isOpen ? 'Hide Debug Log' : 'Show Debug Log'}
            </button>

            {isOpen && (
                <div className="mt-2 bg-slate-950 rounded border border-slate-800 p-2 font-mono text-[10px] text-emerald-500/80 h-24 overflow-y-auto shadow-inner">
                    <div className="flex items-center gap-2 opacity-50 mb-1">
                        <span className="text-slate-600">$</span>
                        <span>/info/log_started</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-600">$</span>
                        <span className="animate-pulse">_</span>
                    </div>
                </div>
            )}
        </div>
    );
};
