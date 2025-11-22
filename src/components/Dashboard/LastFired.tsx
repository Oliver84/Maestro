import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const LastFired: React.FC = () => {
    const { logs, clearLogs } = useAppStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (scrollRef.current) {
            // Use setTimeout to ensure DOM has updated before scrolling
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 0);
        }
    }, [logs]);

    return (
        <div className="mt-2 border-t border-slate-800 pt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal size={12} className="text-slate-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Logs</h3>
                </div>
                {logs.length > 0 && (
                    <button
                        onClick={clearLogs}
                        className="text-[10px] text-slate-600 hover:text-red-400 transition-colors flex items-center gap-1 uppercase tracking-wider font-semibold hover:bg-slate-800 px-2 py-1 rounded"
                    >
                        <Trash2 size={10} />
                        Clear
                    </button>
                )}
            </div>

            <div className="bg-slate-950/50 rounded-lg border border-slate-800 h-32 relative flex flex-col">
                <div
                    ref={scrollRef}
                    className="absolute inset-0 overflow-y-auto p-2 flex flex-col"
                >
                    {logs.length === 0 ? (
                        <div className="m-auto text-slate-700 italic text-center">
                            No logs recorded
                        </div>
                    ) : (
                        <div className="mt-auto space-y-1 pb-1">
                            {logs.map((log, index) => (
                                <div key={index} className="flex items-start gap-2 text-slate-400 leading-tight">
                                    <span className="text-slate-600 shrink-0 text-[10px] font-mono">[{log.timestamp}]</span>
                                    <span className="break-all text-emerald-500/80 text-[10px] font-mono">{log.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
