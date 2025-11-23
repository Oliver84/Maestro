import React, { useEffect, useState } from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatTime } from '../../utils/timeFormat';

export const ShowTimer: React.FC = () => {
    const { showStartTime, showPausedTime, showPausedAt, resetShowTimer } = useAppStore();
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!showStartTime) {
            setElapsed(0);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const totalElapsed = now - showStartTime;

            // Calculate current pause duration if paused
            const currentPauseDuration = showPausedAt !== null ? (now - showPausedAt) : 0;

            // Subtract total paused time from elapsed
            const actualElapsed = totalElapsed - showPausedTime - currentPauseDuration;

            setElapsed(Math.max(0, Math.floor(actualElapsed / 1000))); // Convert to seconds
        }, 100); // Update more frequently for smoother display

        return () => clearInterval(interval);
    }, [showStartTime, showPausedTime, showPausedAt]);

    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    const timeString = hours > 0
        ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : formatTime(elapsed);

    return (
        <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded border border-slate-700">
            <div className="flex items-center gap-2">
                <Clock size={14} className={showStartTime ? 'text-emerald-400' : 'text-slate-500'} />
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        Show Time
                    </span>
                    <span className={`text-sm font-mono font-bold tabular-nums ${showStartTime ? 'text-white' : 'text-slate-600'}`}>
                        {timeString}
                    </span>
                </div>
            </div>
            {showStartTime && (
                <button
                    onClick={resetShowTimer}
                    className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-500 hover:text-white"
                    title="Reset show timer"
                >
                    <RotateCcw size={12} />
                </button>
            )}
        </div>
    );
};
