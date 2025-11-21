import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface LogEntry {
    timestamp: string;
    message: string;
}

const MOCK_LOGS: LogEntry[] = [
    { timestamp: '17:02:15', message: '/ch/16/mix/fader 1.00' },
    { timestamp: '17:02:14', message: '/ch/16/mix/fader 0.99' },
    { timestamp: '17:02:13', message: '/ch/16/mix/fader 0.97' },
    { timestamp: '17:02:12', message: '/ch/16/mix/fader 0.94' },
    { timestamp: '17:02:11', message: '/ch/16/mix/fader 0.91' },
    { timestamp: '17:02:10', message: 'Ready to start show...' },
];

export const LastFired: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mt-6 border-t border-slate-800 pt-4">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left group"
            >
                <div className="flex items-center gap-2">
                    <Terminal size={12} className="text-slate-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Last Fired</h3>
                </div>
                {isExpanded ? (
                    <ChevronUp size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                ) : (
                    <ChevronDown size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                )}
            </button>

            {/* Last command preview (always visible) */}
            {!isExpanded && (
                <div className="mt-2 text-sm text-slate-500 italic font-light">
                    Ready to start show...
                </div>
            )}

            {/* Expanded log view */}
            {isExpanded && (
                <div className="mt-3 bg-slate-950/50 rounded-lg border border-slate-800 p-3 max-h-48 overflow-y-auto">
                    <div className="space-y-1 font-mono text-[10px]">
                        {MOCK_LOGS.map((log, index) => (
                            <div key={index} className="flex items-start gap-3 text-emerald-500/70 hover:text-emerald-400/90 transition-colors">
                                <span className="text-slate-600 shrink-0">&gt;</span>
                                <span className="flex-1">{log.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
