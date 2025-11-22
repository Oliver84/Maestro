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
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        // Start loop immediately to catch any active audio, regardless of cue
        const draw = () => {
            const isAudioActive = AudioEngine.isPlaying();
            setIsPlaying(isAudioActive);

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

                    const width = canvas.width;
                    const height = canvas.height;

                    ctx.clearRect(0, 0, width, height);

                    if (dataArray && isAudioActive) {
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
                            const r = barWidth / 2;

                            // Color logic
                            ctx.fillStyle = '#047857'; // emerald-700 base

                            // Center vertically
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
    }, []); // Empty dependency array: run always

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
                </>
            ) : (
                <div className="opacity-30 flex flex-col items-center z-10">
                    <div className="text-8xl font-black text-slate-700 mb-4">--</div>
                    <div className="text-xl font-light text-slate-500">Standby</div>
                </div>
            )}

            {/* Persistent Audio Visualizer & Time Display */}
            {/* Layout: Time | [ Visualizer + Progress ] | Duration */}
            <div className={`z-20 w-96 mt-10 relative h-16 flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden transition-opacity duration-500 ${isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                    {/* Time & Progress Container */}
                    <div className="relative z-10 flex items-center gap-4 w-full px-4 h-full">
                         {/* Current Time */}
                        <span className="text-xs font-mono text-emerald-400 w-10 text-right shrink-0">
                            {formatTime(currentTime)}
                        </span>

                        {/* Middle Section: Visualizer + Progress Bar */}
                        <div className="flex-1 relative h-full flex items-center justify-center">
                            {/* Canvas Background - constrained to middle section */}
                            <div className="absolute inset-0 opacity-50 flex items-center">
                                <canvas
                                    ref={canvasRef}
                                    width={250} // Adjusted width for inner container
                                    height={40}
                                    className="w-full h-full object-contain" // Contain to prevent stretch issues
                                />
                            </div>

                            {/* Progress Line - overlaid on top of canvas */}
                            <div className="w-full bg-slate-800/30 h-1.5 rounded-full overflow-hidden backdrop-blur-[1px] relative z-20">
                                <div
                                    className="bg-emerald-400 h-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Duration */}
                        <span className="text-xs font-mono text-slate-500 w-10 text-left shrink-0">
                            {formatTime(duration)}
                        </span>
                    </div>
            </div>
        </div>
    );
};
