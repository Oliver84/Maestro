import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AudioEngine } from '../../services/AudioEngine';

export const ActiveCueDisplay: React.FC = () => {
    const { cues, activeCueId } = useAppStore();
    const activeCue = cues.find(c => c.id === activeCueId);

    // Canvas ref for visualizer
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    // Progress state
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        // Reset state when cue changes
        setCurrentTime(0);
        setDuration(0);

        if (!activeCue?.audioFilePath) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const draw = () => {
            // 1. Update Time
            setCurrentTime(AudioEngine.getCurrentTime());
            const d = AudioEngine.getDuration();
            if (d > 0) setDuration(d);

            // 2. Draw Visualizer (Frequency Bars)
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Use Frequency Data for Bar Visualizer
                    const dataArray = AudioEngine.getFrequencyData();

                    if (dataArray) {
                        const width = canvas.width;
                        const height = canvas.height;

                        ctx.clearRect(0, 0, width, height);

                        // Parameters for bar look
                        const barCount = 32; // Number of bars
                        const barWidth = (width / barCount) * 0.6; // Spacing
                        const gap = (width / barCount) * 0.4;
                        let x = 0;

                        // We'll sample the frequency data
                        const bufferLength = dataArray.length;
                        // We want to focus on bass/mids mostly for visuals, typically lower half of FFT
                        const step = Math.floor((bufferLength / 2) / barCount);

                        for (let i = 0; i < barCount; i++) {
                            // Get average amplitude for this frequency bin
                            let val = dataArray[i * step];
                            // Scale it
                            const barHeight = (val / 255) * height * 0.8;

                            // Draw Bar
                            // Rounded top?
                            const r = barWidth / 2;

                            // Color logic (Gradient or solid)
                            ctx.fillStyle = '#047857'; // emerald-700 base

                            // Draw background/inactive part if desired? Or just active.
                            // Let's draw active bars centered vertically or from bottom.
                            // Design requested: "Wave visual behind the progress bar"
                            // Let's center them vertically for a "Voice memo" look

                            const y = (height - barHeight) / 2;

                            // Draw rounded rect
                            ctx.beginPath();
                            ctx.roundRect(x, y, barWidth, barHeight, [r]);
                            ctx.fill();

                            x += barWidth + gap;
                        }
                    }
                }
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [activeCueId, activeCue?.audioFilePath]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center justify-center py-10 text-center relative w-full h-full">
            <h3 className="text-slate-500 font-bold tracking-[0.2em] text-xs uppercase mb-6 z-10">Current Cue</h3>

            {activeCue ? (
                <>
                    <div className="flex items-baseline gap-4 mb-4 z-10">
                        <span className="text-7xl font-black text-amber-400 tracking-tighter">SQ</span>
                        <span className="text-9xl font-black text-amber-400 tracking-tighter">{activeCue.sequence}</span>
                    </div>

                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight max-w-md leading-tight z-10">
                        {activeCue.title}
                    </h1>

                    {/* Scene Name */}
                    {activeCue.scene && (
                         <div className="text-emerald-400 font-bold tracking-wider uppercase text-sm mt-2 z-10">
                            {activeCue.scene}
                        </div>
                    )}

                    <div className="text-slate-400 font-medium italic mt-4 z-10">
                        "Start of Production"
                    </div>

                    {/* Audio Visualizer & Time Display */}
                    {activeCue.audioFilePath && (
                        <div className="z-20 w-96 mt-10 relative h-24 flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                             {/* Canvas Background */}
                             <div className="absolute inset-0 flex items-center px-4 opacity-50">
                                <canvas
                                    ref={canvasRef}
                                    width={350}
                                    height={60}
                                    className="w-full h-full"
                                />
                             </div>

                             {/* Time & Progress Foreground */}
                             <div className="relative z-10 flex flex-col w-full px-6">
                                 <div className="flex justify-center items-baseline gap-2 mb-2 drop-shadow-md">
                                     <span className="text-4xl font-black font-mono text-white tracking-tighter">
                                        {formatTime(currentTime)}
                                     </span>
                                     <span className="text-xl font-medium font-mono text-slate-500">
                                        / {formatTime(duration)}
                                     </span>
                                 </div>

                                 {/* Progress Line */}
                                 <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden backdrop-blur-sm">
                                    <div
                                        className="bg-emerald-400 h-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                    />
                                 </div>
                             </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="opacity-30 flex flex-col items-center z-10">
                    <div className="text-8xl font-black text-slate-700 mb-4">--</div>
                    <div className="text-xl font-light text-slate-500">Standby</div>
                </div>
            )}
        </div>
    );
};
