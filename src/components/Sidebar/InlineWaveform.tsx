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
        const step = Math.ceil(data.length / 100); // Fewer points for compact view
        const points: number[] = [];

        for (let i = 0; i < 100; i++) {
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
                const barWidth = width / waveformPoints.length;
                const barGap = barWidth * 0.25;

                // Background waveform with gradient
                const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
                if (isActive) {
                    bgGradient.addColorStop(0, '#64748b');
                    bgGradient.addColorStop(0.5, '#475569');
                    bgGradient.addColorStop(1, '#64748b');
                } else {
                    bgGradient.addColorStop(0, '#334155');
                    bgGradient.addColorStop(0.5, '#1e293b');
                    bgGradient.addColorStop(1, '#334155');
                }

                waveformPoints.forEach((val, i) => {
                    const x = i * barWidth + barGap / 2;
                    const barHeight = Math.max(val * height, 2);
                    const y = (height - barHeight) / 2;

                    ctx.fillStyle = bgGradient;
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth - barGap, barHeight, [1.5]);
                    ctx.fill();
                });

                // Active/progress waveform with gradient and glow
                if (isActive && progress > 0) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, 0, progressX, height);
                    ctx.clip();

                    // Glow effect
                    ctx.shadowColor = '#10b981';
                    ctx.shadowBlur = 8;

                    // Gradient for active portion
                    const activeGradient = ctx.createLinearGradient(0, 0, 0, height);
                    activeGradient.addColorStop(0, '#34d399');
                    activeGradient.addColorStop(0.5, '#10b981');
                    activeGradient.addColorStop(1, '#34d399');

                    waveformPoints.forEach((val, i) => {
                        const x = i * barWidth + barGap / 2;
                        const barHeight = Math.max(val * height, 2);
                        const y = (height - barHeight) / 2;

                        ctx.fillStyle = activeGradient;
                        ctx.beginPath();
                        ctx.roundRect(x, y, barWidth - barGap, barHeight, [1.5]);
                        ctx.fill();
                    });
                    ctx.restore();
                }
            } else {
                // Simple line when no waveform with gradient
                const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
                if (isActive) {
                    lineGradient.addColorStop(0, 'rgba(100, 116, 139, 0.4)');
                    lineGradient.addColorStop(0.5, 'rgba(100, 116, 139, 0.7)');
                    lineGradient.addColorStop(1, 'rgba(100, 116, 139, 0.4)');
                } else {
                    lineGradient.addColorStop(0, 'rgba(51, 65, 85, 0.3)');
                    lineGradient.addColorStop(0.5, 'rgba(51, 65, 85, 0.6)');
                    lineGradient.addColorStop(1, 'rgba(51, 65, 85, 0.3)');
                }

                ctx.fillStyle = lineGradient;
                ctx.beginPath();
                ctx.roundRect(0, height / 2 - 1.5, width, 3, [1.5]);
                ctx.fill();

                if (isActive && progress > 0) {
                    // Active progress with glow
                    ctx.shadowColor = '#10b981';
                    ctx.shadowBlur = 6;

                    const progressGradient = ctx.createLinearGradient(0, 0, progressX, 0);
                    progressGradient.addColorStop(0, '#34d399');
                    progressGradient.addColorStop(1, '#10b981');

                    ctx.fillStyle = progressGradient;
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
            <div className="w-full h-16 bg-slate-950/90 rounded-md overflow-hidden relative border border-slate-800/60 shadow-inner">
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
