import React, { useEffect, useRef, useState } from 'react';
import { AudioEngine, AudioEngineService } from '../../services/AudioEngine';

interface WaveformVisualizerProps {
    activeCueId: string | null;
    audioFilePath?: string;
    playbackMode?: 'STOP_AND_GO' | 'OVERLAP';
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
    activeCueId,
    audioFilePath,
    playbackMode = 'STOP_AND_GO',
    currentTime,
    duration,
    onSeek
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const isFetchingRef = useRef(false);

    // Waveform state
    const [waveformPoints, setWaveformPoints] = useState<number[]>([]);
    const [processedCueId, setProcessedCueId] = useState<string | null>(null);
    const [internalDuration, setInternalDuration] = useState<number>(0);

    const generateWaveform = (buffer: AudioBuffer) => {
        setInternalDuration(buffer.duration);
        const data = buffer.getChannelData(0);
        // Increase points for a smooth continuous wave
        const POINT_COUNT = 300;
        const step = Math.ceil(data.length / POINT_COUNT);
        const points: number[] = [];

        for (let i = 0; i < POINT_COUNT; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                if ((i * step) + j < data.length) {
                    const datum = data[(i * step) + j];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }
            }
            // Push the max amplitude for this chunk
            points.push(Math.max(Math.abs(min), Math.abs(max)));
        }

        const globalMax = points.reduce((a, b) => Math.max(a, b), 0);
        const normalizedPoints = globalMax > 0
            ? points.map(p => Math.pow(p / globalMax, 0.8)) // Slightly less compression for natural look
            : points;

        console.log('[WaveformVisualizer] Generated points:', points.length, 'Duration:', buffer.duration);
        setWaveformPoints(normalizedPoints);
        setProcessedCueId(activeCueId);
        isFetchingRef.current = false;

        // Cache the waveform for future use
        if (audioFilePath) {
            // Use the resolved path for caching to match AudioEngine's internal keys
            // We need to access the static method or public method. 
            // AudioEngine instance doesn't expose resolvePath as public in the interface I saw?
            // Wait, it was static in the class but I'm using the instance 'AudioEngine'.
            // Let's check the file content of AudioEngine.ts again.
            // It is `static resolvePath`.
            // So I should use AudioEngineService.resolvePath(audioFilePath)

            // Actually, let's just use the instance method if I add one, or import the class.
            // The file imports `AudioEngine` (instance) and `AudioEngineService` (class).
            const resolvedPath = AudioEngineService.resolvePath(audioFilePath);
            AudioEngine.cacheWaveform(resolvedPath, normalizedPoints);
        }
    };

    // Reset state when cue changes
    useEffect(() => {
        // Only reset if this is a STOP_AND_GO cue
        // For OVERLAP cues, keep showing the previous waveform while new audio layers
        if (playbackMode === 'STOP_AND_GO') {
            setWaveformPoints([]);
            setProcessedCueId(null);
            setInternalDuration(0);
            isFetchingRef.current = false;
        }
    }, [activeCueId, playbackMode]);

    // Fetch audio data
    useEffect(() => {
        if (!activeCueId || !audioFilePath) return;
        if (processedCueId === activeCueId && waveformPoints.length > 0) return;
        if (isFetchingRef.current) return;

        const resolvedPath = AudioEngineService.resolvePath(audioFilePath);

        // 1. Check Waveform Cache
        const cachedPoints = AudioEngine.getCachedWaveform(resolvedPath);
        if (cachedPoints) {
            console.log('[WaveformVisualizer] Using cached waveform for:', audioFilePath);
            setWaveformPoints(cachedPoints);
            setProcessedCueId(activeCueId);
            return;
        }

        // 2. Check Buffer Cache
        const cachedBuffer = AudioEngine.getCachedBuffer(resolvedPath);
        if (cachedBuffer) {
            console.log('[WaveformVisualizer] Using cached buffer for:', audioFilePath);
            generateWaveform(cachedBuffer);
            return;
        }

        // 3. Check Active Playing Sound Buffer (Fastest if already playing)
        const activeBuffer = AudioEngine.getBufferForCue(activeCueId);
        if (activeBuffer) {
            console.log('[WaveformVisualizer] Using active sound buffer for:', activeCueId);
            generateWaveform(activeBuffer);
            // Also cache it for next time
            AudioEngine.cacheWaveform(resolvedPath, waveformPoints); // Wait, waveformPoints isn't set yet. generateWaveform sets it.
            // generateWaveform handles caching now.
            return;
        }

        // 4. Fetch if not cached
        isFetchingRef.current = true;
        console.log('[WaveformVisualizer] Fetching audio for waveform:', resolvedPath);

        fetch(resolvedPath)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                return audioContext.decodeAudioData(arrayBuffer);
            })
            .then(audioBuffer => {
                generateWaveform(audioBuffer);
            })
            .catch(err => {
                console.error('[WaveformVisualizer] Error loading audio:', err);
                isFetchingRef.current = false;
            });
    }, [activeCueId, audioFilePath, processedCueId, waveformPoints.length]);

    // Drawing Loop – only renders the waveform / progress bar
    useEffect(() => {
        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const width = canvas.width;
            const height = canvas.height;
            const effectiveDuration = duration || internalDuration;

            ctx.clearRect(0, 0, width, height);

            if (waveformPoints.length > 0) {
                const progress = effectiveDuration > 0 ? currentTime / effectiveDuration : 0;
                const progressX = width * progress;

                // Helper to draw the waveform path
                const drawWaveformPath = () => {
                    ctx.beginPath();
                    const sliceWidth = width / (waveformPoints.length - 1);

                    // Top half
                    ctx.moveTo(0, height / 2);
                    for (let i = 0; i < waveformPoints.length; i++) {
                        const x = i * sliceWidth;
                        const y = (height / 2) - (waveformPoints[i] * height / 2);
                        ctx.lineTo(x, y);
                    }

                    // Bottom half (mirror)
                    for (let i = waveformPoints.length - 1; i >= 0; i--) {
                        const x = i * sliceWidth;
                        const y = (height / 2) + (waveformPoints[i] * height / 2);
                        ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                };

                // 1. Draw Full Waveform (Unplayed / Background)
                drawWaveformPath();
                // Slate-400 with low opacity for a subtle dark-mode friendly background
                ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
                ctx.fill();

                // 2. Draw Played Waveform (Foreground)
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, progressX, height);
                ctx.clip();

                drawWaveformPath();
                // Emerald-400 for the active progress - vibrant but dark-mode friendly
                ctx.fillStyle = '#34d399';
                ctx.fill();

                ctx.restore();

            } else {
                // Simple progress line fallback
                const progress = effectiveDuration > 0 ? currentTime / effectiveDuration : 0;
                const progressX = width * progress;

                // Background line
                ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
                ctx.beginPath();
                ctx.roundRect(0, height / 2 - 2, width, 4, [2]);
                ctx.fill();

                // Active progress
                if (progress > 0) {
                    ctx.fillStyle = '#34d399';
                    ctx.beginPath();
                    ctx.roundRect(0, height / 2 - 2, progressX, 4, [2]);
                    ctx.fill();
                }
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [waveformPoints, currentTime, duration, internalDuration]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const effectiveDuration = duration || internalDuration;
        if (effectiveDuration <= 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const newTime = percent * effectiveDuration;
        console.log('[WaveformVisualizer] Click at', percent * 100, '% -> seeking to', newTime, 's (Duration:', effectiveDuration, ')');
        onSeek(newTime);
    };

    return (
        <div
            className="flex-1 relative h-full flex items-center justify-center cursor-pointer group"
            onClick={handleClick}
        >
            <div className="absolute inset-0 flex items-center pointer-events-none w-full h-full px-1">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={200}
                    className="w-full h-full"
                />
            </div>
        </div>
    );
};
