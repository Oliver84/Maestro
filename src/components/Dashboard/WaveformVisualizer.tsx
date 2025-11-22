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

    const generateWaveform = (buffer: AudioBuffer) => {
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / 200);
        const points: number[] = [];

        for (let i = 0; i < 200; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                if ((i * step) + j < data.length) {
                    const datum = data[(i * step) + j];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }
            }
            points.push(Math.max(Math.abs(min), Math.abs(max)));
        }

        const globalMax = points.reduce((a, b) => Math.max(a, b), 0);
        const normalizedPoints = globalMax > 0
            ? points.map(p => Math.pow(p / globalMax, 0.65))
            : points;

        console.log('[WaveformVisualizer] Generated points:', points.length);
        setWaveformPoints(normalizedPoints);
        setProcessedCueId(activeCueId);
        isFetchingRef.current = false;
    };

    // Reset state when cue changes
    useEffect(() => {
        // Only reset if this is a STOP_AND_GO cue
        // For OVERLAP cues, keep showing the previous waveform while new audio layers
        if (playbackMode === 'STOP_AND_GO') {
            setWaveformPoints([]);
            setProcessedCueId(null);
            isFetchingRef.current = false;
        }
    }, [activeCueId, playbackMode]);

    // Waveform generation effect (buffer retrieval and fallback fetch)
    useEffect(() => {
        // If we already have processed this cue, do nothing.
        if (!activeCueId || activeCueId === processedCueId) return;

        const buffer = AudioEngine.getActiveBuffer();
        if (buffer) {
            console.log('[WaveformVisualizer] Generating waveform from Engine buffer');
            generateWaveform(buffer);
            return;
        }

        // Fallback fetch if we have an audio file path
        if (audioFilePath && !isFetchingRef.current) {
            console.log('[WaveformVisualizer] Buffer missing, fetching manually:', audioFilePath);
            isFetchingRef.current = true;
            const src = AudioEngineService.resolvePath(audioFilePath);
            fetch(src)
                .then(res => res.arrayBuffer())
                .then(arrayBuffer => {
                    const ctx = AudioEngine.getAudioContext() || new AudioContext();
                    return ctx.decodeAudioData(arrayBuffer);
                })
                .then(decodedBuffer => {
                    // Ensure the cue hasn't changed during async fetch
                    // Use a fresh activeCueId from the closure for comparison
                    if (activeCueId === processedCueId) return; // already processed by another fetch
                    generateWaveform(decodedBuffer);
                })
                .catch(err => {
                    console.error('[WaveformVisualizer] Failed to fetch waveform:', err);
                    isFetchingRef.current = false;
                });
        }
    }, [activeCueId, audioFilePath, processedCueId]);

    // Drawing Loop – only renders the waveform / progress bar
    useEffect(() => {
        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            if (waveformPoints.length > 0) {
                const barWidth = width / waveformPoints.length;
                const progress = duration > 0 ? currentTime / duration : 0;
                const progressX = width * progress;

                // Background (dim) waveform
                ctx.fillStyle = '#334155';
                waveformPoints.forEach((val, i) => {
                    const x = i * barWidth;
                    const barHeight = val * height;
                    const y = (height - barHeight) / 2;
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth * 0.6, barHeight, [2]);
                    ctx.fill();
                });

                // Foreground (filled) waveform up to current progress
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, progressX, height);
                ctx.clip();
                ctx.fillStyle = '#34d399';
                waveformPoints.forEach((val, i) => {
                    const x = i * barWidth;
                    const barHeight = val * height;
                    const y = (height - barHeight) / 2;
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth * 0.6, barHeight, [2]);
                    ctx.fill();
                });
                ctx.restore();
            } else {
                // Simple progress line fallback
                const progress = duration > 0 ? currentTime / duration : 0;
                const progressX = width * progress;
                ctx.fillStyle = 'rgba(51, 65, 85, 0.5)';
                ctx.beginPath();
                ctx.roundRect(0, height / 2 - 2, width, 4, [2]);
                ctx.fill();
                ctx.fillStyle = '#34d399';
                ctx.beginPath();
                ctx.roundRect(0, height / 2 - 2, progressX, 4, [2]);
                ctx.fill();
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [waveformPoints, currentTime, duration]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const newTime = percent * duration;
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
                    height={128}
                    className="w-full h-full"
                />
            </div>
        </div>
    );
};
