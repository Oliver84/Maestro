import React, { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, Wifi, WifiOff } from 'lucide-react';
import { AudioEngine } from '../../services/AudioEngine';
import { getOscClient } from '../../services/OscClient';

interface PerformanceMetrics {
    fps: number;
    memory: number;
    audioLatency: number;
    cacheStats: {
        preloadedAudio: number;
        cachedBuffers: number;
        cachedWaveforms: number;
        activeSounds: number;
    };
    oscConnected: boolean;
}

interface PerformanceOverlayProps {
    isVisible?: boolean;
    onToggle?: (visible: boolean) => void;
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
    isVisible: externalIsVisible,
    onToggle
}) => {
    const [internalIsVisible, setInternalIsVisible] = useState(false);
    const isVisible = externalIsVisible !== undefined ? externalIsVisible : internalIsVisible;

    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        fps: 0,
        memory: 0,
        audioLatency: 0,
        cacheStats: {
            preloadedAudio: 0,
            cachedBuffers: 0,
            cachedWaveforms: 0,
            activeSounds: 0
        },
        oscConnected: false
    });

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Toggle with Cmd/Ctrl + Shift + P or Cmd/Ctrl + Shift + M
            const isPerformanceShortcut =
                ((e.key === 'P' || e.key === 'M') && (e.metaKey || e.ctrlKey) && e.shiftKey);

            if (isPerformanceShortcut) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[PerformanceOverlay] Toggling visibility');

                if (onToggle) {
                    onToggle(!isVisible);
                } else {
                    setInternalIsVisible(prev => !prev);
                }
            }
        };

        // Use capture phase to ensure we get the event first
        window.addEventListener('keydown', handleKeyPress, true);
        return () => window.removeEventListener('keydown', handleKeyPress, true);
    }, [isVisible, onToggle]);

    useEffect(() => {
        if (!isVisible) return;

        let frameCount = 0;
        let lastTime = performance.now();
        let animationFrameId: number;

        const updateMetrics = () => {
            const now = performance.now();
            frameCount++;

            // Update FPS every second
            if (now - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (now - lastTime));

                // Get memory usage (if available)
                const memory = (performance as any).memory
                    ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
                    : 0;

                // Get audio latency
                const audioContext = AudioEngine.getAudioContext();
                const audioLatency = audioContext
                    ? Math.round(audioContext.baseLatency * 1000)
                    : 0;

                // Get cache stats
                const cacheStats = AudioEngine.getCacheStats();

                // Get OSC connection status
                const oscClient = getOscClient();
                const oscConnected = oscClient.getConnectionStatus();

                setMetrics({
                    fps,
                    memory,
                    audioLatency,
                    cacheStats,
                    oscConnected
                });

                frameCount = 0;
                lastTime = now;
            }

            animationFrameId = requestAnimationFrame(updateMetrics);
        };

        animationFrameId = requestAnimationFrame(updateMetrics);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isVisible]);

    if (!isVisible) return null;

    const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
        if (value <= thresholds.good) return 'text-emerald-400';
        if (value <= thresholds.warning) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <div className="fixed top-4 left-4 z-[9998] bg-slate-950/95 border border-slate-700 rounded-lg shadow-2xl backdrop-blur-md p-4 min-w-[280px]">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
                <Activity size={16} className="text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Performance
                </h3>
                <div className="ml-auto flex gap-1">
                    <kbd className="px-2 py-0.5 text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800 rounded">
                        ⌘⇧P
                    </kbd>
                    <span className="text-slate-700 text-[9px]">or</span>
                    <kbd className="px-2 py-0.5 text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800 rounded">
                        ⌘⇧M
                    </kbd>
                </div>
            </div>

            <div className="space-y-3">
                {/* FPS */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-slate-500" />
                        <span className="text-xs text-slate-400">FPS</span>
                    </div>
                    <span className={`text-sm font-bold ${getStatusColor(60 - metrics.fps, { good: 0, warning: 10 })}`}>
                        {metrics.fps}
                    </span>
                </div>

                {/* Memory */}
                {metrics.memory > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <HardDrive size={14} className="text-slate-500" />
                            <span className="text-xs text-slate-400">Memory</span>
                        </div>
                        <span className={`text-sm font-bold ${getStatusColor(metrics.memory, { good: 100, warning: 250 })}`}>
                            {metrics.memory} MB
                        </span>
                    </div>
                )}

                {/* Audio Latency */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-slate-500" />
                        <span className="text-xs text-slate-400">Audio Latency</span>
                    </div>
                    <span className={`text-sm font-bold ${getStatusColor(metrics.audioLatency, { good: 10, warning: 30 })}`}>
                        {metrics.audioLatency}ms
                    </span>
                </div>

                {/* OSC Connection */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {metrics.oscConnected ? (
                            <Wifi size={14} className="text-emerald-500" />
                        ) : (
                            <WifiOff size={14} className="text-red-500" />
                        )}
                        <span className="text-xs text-slate-400">X32 Connection</span>
                    </div>
                    <span className={`text-sm font-bold ${metrics.oscConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                        {metrics.oscConnected ? 'Connected' : 'Offline'}
                    </span>
                </div>

                {/* Cache Stats */}
                <div className="pt-3 border-t border-slate-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                        Cache Stats
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Preloaded:</span>
                            <span className="text-slate-300 font-mono">{metrics.cacheStats.preloadedAudio}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Buffers:</span>
                            <span className="text-slate-300 font-mono">{metrics.cacheStats.cachedBuffers}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Waveforms:</span>
                            <span className="text-slate-300 font-mono">{metrics.cacheStats.cachedWaveforms}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Playing:</span>
                            <span className="text-emerald-400 font-mono font-bold">{metrics.cacheStats.activeSounds}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
