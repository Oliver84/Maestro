import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AudioEngine } from '../../services/AudioEngine';

export const ActiveCueDisplay: React.FC = () => {
    const { cues, activeCueId } = useAppStore();
    const activeCue = cues.find(c => c.id === activeCueId);

    // Canvas ref for visualizer
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        if (!activeCue?.audioFilePath) {
            cancelAnimationFrame(animationRef.current!);
            return;
        }

        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const dataArray = AudioEngine.getWaveformData();
            if (!dataArray) {
                 animationRef.current = requestAnimationFrame(draw);
                 return;
            }

            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#10b981'; // emerald-500
            ctx.beginPath();

            const sliceWidth = width * 1.0 / dataArray.length;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [activeCueId, activeCue?.audioFilePath]);

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

                    <div className="text-slate-400 font-medium italic mt-4 z-10">
                        "Start of Production"
                    </div>

                    {/* Waveform Visualization Overlay */}
                    {activeCue.audioFilePath && (
                         <div className="absolute inset-0 w-full h-full flex items-center justify-center opacity-40 pointer-events-none">
                            <canvas
                                ref={canvasRef}
                                width={600}
                                height={200}
                                className="w-full h-full max-h-[300px]"
                            />
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
