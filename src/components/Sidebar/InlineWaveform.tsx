import React, { useEffect, useRef, useState } from 'react';
import { AudioEngine, AudioEngineService } from '../../services/AudioEngine';

interface InlineWaveformProps {
    cueId: string;
    audioFilePath: string;
    isActive: boolean;
}

export const InlineWaveform: React.FC<InlineWaveformProps> = ({
    cueId,
    audioFilePath,
    isActive
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const [waveformPoints, setWaveformPoints] = useState<number[]>([]);
    const [processedPath, setProcessedPath] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const isFetchingRef = useRef(false);

    const generateWaveform = (buffer: AudioBuffer) => {
        const data = buffer.getChannelData(0);
        // More points for smooth continuous wave
        const POINT_COUNT = 150;
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
            points.push(Math.max(Math.abs(min), Math.abs(max)));
        }

        const globalMax = points.reduce((a, b) => Math.max(a, b), 0);
        const normalizedPoints = globalMax > 0
            ? points.map(p => Math.pow(p / globalMax, 0.8))
            : points;

        setWaveformPoints(normalizedPoints);
        setProcessedPath(audioFilePath);
        setDuration(buffer.duration);
        isFetchingRef.current = false;
    };

    // Generate waveform when audio file changes
    useEffect(() => {
        if (!audioFilePath || audioFilePath === processedPath) return;

        const buffer = AudioEngine.getBufferForCue(cueId);
        if (buffer) {
            generateWaveform(buffer);
            return;
        }

        // Fallback fetch
        if (!isFetchingRef.current) {
            isFetchingRef.current = true;
            const src = AudioEngineService.resolvePath(audioFilePath);
            fetch(src)
                .then(res => res.arrayBuffer())
                .then(arrayBuffer => {
                    const ctx = AudioEngine.getAudioContext() || new AudioContext();
                    return ctx.decodeAudioData(arrayBuffer);
                })
                .then(decodedBuffer => {
                    generateWaveform(decodedBuffer);
                })
                .catch(err => {
                    console.error('[InlineWaveform] Failed to fetch:', err);
                    isFetchingRef.current = false;
                });
        }
    }, [audioFilePath, cueId, processedPath]);

    // Drawing loop - always runs to update time and progress
    useEffect(() => {
        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            // Update time from AudioEngine if active
            if (isActive) {
                const time = AudioEngine.getTimeForCue(cueId);
                const dur = AudioEngine.getDurationForCue(cueId);
                setCurrentTime(time);
                if (dur > 0) setDuration(dur);
            }

            const progress = duration > 0 && isActive ? currentTime / duration : 0;
            const progressX = width * progress;

            if (waveformPoints.length > 0) {
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
                ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
                ctx.fill();

                // 2. Draw Played Waveform (Foreground)
                if (isActive && progress > 0) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, 0, progressX, height);
                    ctx.clip();

                    drawWaveformPath();
                    ctx.fillStyle = '#34d399';
                    ctx.fill();
                    ctx.restore();
                }
            } else {
                // Simple line when no waveform
                // Background line
                ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
                ctx.beginPath();
                ctx.roundRect(0, height / 2 - 1.5, width, 3, [1.5]);
                ctx.fill();

                if (isActive && progress > 0) {
                    // Active progress
                    ctx.fillStyle = '#34d399';
                    ctx.beginPath();
                    ctx.roundRect(0, height / 2 - 1.5, progressX, 3, [1.5]);
                    ctx.fill();
                }
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isActive, waveformPoints, cueId, currentTime, duration]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full">
            <div className="w-full h-16 relative">
                <canvas
                    ref={canvasRef}
                    width={200}
                    height={64}
                    className="w-full h-full"
                />
            </div>
            {/* Time display */}
            <div className="flex justify-between items-center mt-1.5 text-[10px] font-mono">
                <span className={`transition-colors ${isActive ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                    {isActive ? formatTime(currentTime) : '0:00'}
                </span>
                <span className="text-slate-500">
                    {duration > 0 ? formatTime(duration) : '--:--'}
                </span>
            </div>
        </div>
    );
};
