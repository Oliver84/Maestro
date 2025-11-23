import { Howl, Howler } from 'howler';

export interface AudioPlaybackOptions {
    volume?: number; // 0.0 to 1.0
    loop?: boolean;
    cueId?: string; // Track which cue this sound belongs to
    onEnd?: () => void;
    onError?: (error: any) => void;
}

export interface ActiveSound {
    cueId: string;
    filePath: string;
    howl: Howl;
    startTime: number; // When this sound started playing
}

export interface CachedBuffer {
    buffer: AudioBuffer;
    timestamp: number;
}

export interface CachedWaveform {
    points: number[];
    timestamp: number;
}

export class AudioEngineService {
    // Track active sounds with metadata
    private activeSounds: Map<string, ActiveSound> = new Map();

    // We track the "primary" or "last fired" sound for progress display purposes
    private primaryCueId: string | null = null;

    private masterVolume: number = 1.0;
    public analyser: AnalyserNode | null = null;
    private bufferLength: number = 0;
    private dataArray: Uint8Array | null = null;

    // Pre-buffering and caching
    private bufferCache: Map<string, CachedBuffer> = new Map();
    private waveformCache: Map<string, CachedWaveform> = new Map();
    private preloadedHowls: Map<string, Howl> = new Map();
    private readonly CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes
    private readonly MAX_CACHE_SIZE = 50; // Maximum cached items

    constructor() {
        this.setupAnalyser();
    }

    private setupAnalyser() {
        if (Howler.ctx) {
            this.analyser = Howler.ctx.createAnalyser();
            this.analyser.fftSize = 2048;
            // Connect Howler's master gain to the analyser
            Howler.masterGain.connect(this.analyser);
            // Connect analyser to destination so we can hear it
            this.analyser.connect(Howler.ctx.destination);

            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
        } else {
            console.warn('[Audio Engine] Web Audio API not available in Howler context yet.');
        }
    }

    private desiredDeviceId: string = '';

    async setOutputDevice(deviceId: string) {
        this.desiredDeviceId = deviceId;

        if (Howler.ctx && (Howler.ctx as any).setSinkId) {
            try {
                // 'default' is the standard ID for the default device
                const sinkId = deviceId === 'default' ? '' : deviceId;

                // Check if we're already on this device
                if ((Howler.ctx as any).sinkId === sinkId) {
                    console.log(`[Audio Engine] Already on device: ${deviceId}`);
                    return;
                }

                await (Howler.ctx as any).setSinkId(sinkId);
                console.log(`[Audio Engine] Output device set to: ${deviceId}`);
            } catch (error) {
                console.error('[Audio Engine] Failed to set output device:', error);
            }
        } else {
            console.warn('[Audio Engine] setSinkId not supported or AudioContext not ready');
        }
    }

    getWaveformData(): Uint8Array | null {
        if (this.analyser && this.dataArray) {
            this.analyser.getByteTimeDomainData(this.dataArray as any);
            return this.dataArray;
        }
        return null;
    }

    getFrequencyData(): Uint8Array | null {
        if (this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray as any);
            return this.dataArray;
        }
        return null;
    }

    setMasterVolume(volume: number) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        // Update all active sounds
        this.activeSounds.forEach(activeSound => {
            activeSound.howl.volume(this.masterVolume);
        });
        console.log(`[Audio Engine] Master volume set to: ${this.masterVolume}`);
    }

    play(filePath: string, options: AudioPlaybackOptions = {}) {
        // Force AudioContext to resume (Chrome/Electron autoplay policy)

        if (Howler.ctx) {
            if (Howler.ctx.state === 'suspended') {
                Howler.ctx.resume().then(() => {
                    console.log('[Audio Engine] AudioContext resumed');
                });
            }

            // Ensure output device is correct
            if (this.desiredDeviceId && (Howler.ctx as any).setSinkId) {
                const currentSinkId = (Howler.ctx as any).sinkId;
                const desiredSinkId = this.desiredDeviceId === 'default' ? '' : this.desiredDeviceId;

                if (currentSinkId !== desiredSinkId) {
                    console.log(`[Audio Engine] Enforcing output device: ${this.desiredDeviceId}`);
                    (Howler.ctx as any).setSinkId(desiredSinkId).catch((err: any) => {
                        console.error('[Audio Engine] Failed to enforce output device:', err);
                    });
                }
            }
        }

        // Ensure analyser is set up (sometimes Howler.ctx inits lazily)
        if (!this.analyser) {
            this.setupAnalyser();
        }

        // Handle path protocol for Electron
        let src = filePath;
        if (!filePath.startsWith('http') && !filePath.startsWith('media://')) {
            if (filePath.startsWith('file://')) {
                src = filePath.replace('file://', 'media://');
            } else {
                src = `media://${filePath.startsWith('/') ? '' : '/'}${filePath}`;
            }
        }

        const volume = options.volume !== undefined ? options.volume : this.masterVolume;
        const cueId = options.cueId || `sound-${Date.now()}`;

        console.log(`[Audio Engine] Playing: ${src} (cue: ${cueId}) at volume ${volume}`);

        const sound = new Howl({
            src: [src],
            volume,
            html5: false,
            format: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'],
            loop: options.loop || false,
            onend: () => {
                console.log(`[Audio Engine] Playback finished: ${src}`);
                this.activeSounds.delete(cueId);
                if (this.primaryCueId === cueId) {
                    this.primaryCueId = null;
                }
                if (options.onEnd) {
                    options.onEnd();
                }
            },
            onloaderror: (_id, error) => {
                console.error(`[Audio Engine] Load error for ${src}:`, error);
                this.activeSounds.delete(cueId);
                if (options.onError) {
                    options.onError(error);
                }
            },
            onplayerror: (_id, error) => {
                console.error(`[Audio Engine] Play error for ${src}:`, error);
                this.activeSounds.delete(cueId);
                if (options.onError) {
                    options.onError(error);
                }
            }
        });

        const activeSound: ActiveSound = {
            cueId,
            filePath: src,
            howl: sound,
            startTime: Date.now()
        };

        this.activeSounds.set(cueId, activeSound);
        this.primaryCueId = cueId;
        sound.play();
    }

    stopAll() {
        const duration = 300;
        console.log('[Audio Engine] Stopping all playback with fade out');

        // Create a snapshot of current sounds to stop
        const soundsToStop = Array.from(this.activeSounds.values());

        soundsToStop.forEach(activeSound => {
            activeSound.howl.fade(activeSound.howl.volume(), 0, duration);
            setTimeout(() => {
                activeSound.howl.stop();
                activeSound.howl.unload();
                // Remove from map ONLY if it's still the same sound instance
                // (Avoid removing a newly started instance of the same cue)
                const currentSound = this.activeSounds.get(activeSound.cueId);
                if (currentSound === activeSound) {
                    this.activeSounds.delete(activeSound.cueId);
                }
            }, duration);
        });

        this.primaryCueId = null;
    }

    pauseAll() {
        console.log('[Audio Engine] Pausing all playback');
        this.activeSounds.forEach(activeSound => {
            activeSound.howl.pause();
        });
    }

    resumeAll() {
        console.log('[Audio Engine] Resuming all playback');
        this.activeSounds.forEach(activeSound => {
            activeSound.howl.play();
        });
    }

    isPlaying(): boolean {
        // Return true if ANY sound is playing
        return this.activeSounds.size > 0;
    }

    getActiveSounds(): ActiveSound[] {
        return Array.from(this.activeSounds.values());
    }

    getCurrentTime(): number {
        // Return time of the "primary" (most recently fired) sound
        const primarySound = this.primaryCueId ? this.activeSounds.get(this.primaryCueId) : null;
        if (primarySound) {
            return primarySound.howl.seek() as number;
        }
        return 0;
    }

    getTimeForCue(cueId: string): number {
        const sound = this.activeSounds.get(cueId);
        if (sound) {
            return sound.howl.seek() as number;
        }
        return 0;
    }

    getDuration(): number {
        const primarySound = this.primaryCueId ? this.activeSounds.get(this.primaryCueId) : null;
        if (primarySound) {
            return primarySound.howl.duration();
        }
        return 0;
    }

    getDurationForCue(cueId: string): number {
        const sound = this.activeSounds.get(cueId);
        if (sound) {
            return sound.howl.duration();
        }
        return 0;
    }

    seek(time: number) {
        const primarySound = this.primaryCueId ? this.activeSounds.get(this.primaryCueId) : null;
        if (primarySound) {
            primarySound.howl.seek(time);
        }
    }

    seekCue(cueId: string, time: number) {
        const sound = this.activeSounds.get(cueId);
        if (sound) {
            sound.howl.seek(time);
        }
    }

    getActiveBuffer(): AudioBuffer | null {
        const primarySound = this.primaryCueId ? this.activeSounds.get(this.primaryCueId) : null;
        if (primarySound) {
            return this.getBufferForHowl(primarySound.howl);
        }
        return null;
    }

    getBufferForCue(cueId: string): AudioBuffer | null {
        const sound = this.activeSounds.get(cueId);
        if (sound) {
            return this.getBufferForHowl(sound.howl);
        }
        return null;
    }

    private getBufferForHowl(howl: Howl): AudioBuffer | null {
        const h = howl as any;
        // Check the main cached buffer on the Howl instance (standard Howler v2)
        if (h._buffer) {
            return h._buffer;
        }
        // Fallback: Check internal sound nodes
        if (h._sounds && h._sounds.length > 0) {
            for (const sound of h._sounds) {
                if (sound._node && sound._node.buffer) {
                    return sound._node.buffer;
                }
            }
        }
        return null;
    }

    getAudioContext(): AudioContext | null {
        return Howler.ctx || null;
    }

    // Pre-buffering and Caching Methods

    /**
     * Preload an audio file into memory without playing it
     * This eliminates latency when the cue is fired
     */
    async preloadAudio(filePath: string): Promise<void> {
        const src = AudioEngineService.resolvePath(filePath);

        // Check if already preloaded
        if (this.preloadedHowls.has(src)) {
            console.log(`[Audio Engine] Already preloaded: ${src}`);
            return;
        }

        console.log(`[Audio Engine] Preloading: ${src}`);

        return new Promise((resolve, reject) => {
            const howl = new Howl({
                src: [src],
                html5: false,
                format: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'],
                preload: true,
                onload: () => {
                    this.preloadedHowls.set(src, howl);
                    console.log(`[Audio Engine] Preloaded successfully: ${src}`);

                    // Also cache the buffer
                    const buffer = this.getBufferForHowl(howl);
                    if (buffer) {
                        this.bufferCache.set(src, {
                            buffer,
                            timestamp: Date.now()
                        });
                    }

                    resolve();
                },
                onloaderror: (_id, error) => {
                    console.error(`[Audio Engine] Preload error: ${src}`, error);
                    reject(error);
                }
            });
        });
    }

    /**
     * Get a preloaded Howl instance (for instant playback)
     */
    getPreloadedHowl(filePath: string): Howl | null {
        const src = AudioEngineService.resolvePath(filePath);
        return this.preloadedHowls.get(src) || null;
    }

    /**
     * Cache waveform data to avoid regeneration
     */
    cacheWaveform(filePath: string, points: number[]): void {
        const src = AudioEngineService.resolvePath(filePath);
        this.waveformCache.set(src, {
            points,
            timestamp: Date.now()
        });
        this.cleanupCache();
    }

    /**
     * Get cached waveform data
     */
    getCachedWaveform(filePath: string): number[] | null {
        const src = AudioEngineService.resolvePath(filePath);
        const cached = this.waveformCache.get(src);

        if (!cached) return null;

        // Check if cache is still valid
        if (Date.now() - cached.timestamp > this.CACHE_MAX_AGE) {
            this.waveformCache.delete(src);
            return null;
        }

        return cached.points;
    }

    /**
     * Get cached audio buffer
     */
    getCachedBuffer(filePath: string): AudioBuffer | null {
        const src = AudioEngineService.resolvePath(filePath);
        const cached = this.bufferCache.get(src);

        if (!cached) return null;

        // Check if cache is still valid
        if (Date.now() - cached.timestamp > this.CACHE_MAX_AGE) {
            this.bufferCache.delete(src);
            return null;
        }

        return cached.buffer;
    }

    /**
     * Clean up old cache entries
     */
    private cleanupCache(): void {
        const now = Date.now();

        // Clean waveform cache
        if (this.waveformCache.size > this.MAX_CACHE_SIZE) {
            const entries = Array.from(this.waveformCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

            // Remove oldest 20%
            const toRemove = Math.floor(entries.length * 0.2);
            for (let i = 0; i < toRemove; i++) {
                this.waveformCache.delete(entries[i][0]);
            }
        }

        // Clean buffer cache
        if (this.bufferCache.size > this.MAX_CACHE_SIZE) {
            const entries = Array.from(this.bufferCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

            const toRemove = Math.floor(entries.length * 0.2);
            for (let i = 0; i < toRemove; i++) {
                this.bufferCache.delete(entries[i][0]);
            }
        }

        // Remove expired entries
        for (const [key, value] of this.waveformCache.entries()) {
            if (now - value.timestamp > this.CACHE_MAX_AGE) {
                this.waveformCache.delete(key);
            }
        }

        for (const [key, value] of this.bufferCache.entries()) {
            if (now - value.timestamp > this.CACHE_MAX_AGE) {
                this.bufferCache.delete(key);
            }
        }
    }

    /**
     * Clear all caches
     */
    clearCaches(): void {
        // Unload preloaded howls
        for (const howl of this.preloadedHowls.values()) {
            howl.unload();
        }

        this.preloadedHowls.clear();
        this.bufferCache.clear();
        this.waveformCache.clear();

        console.log('[Audio Engine] All caches cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            preloadedAudio: this.preloadedHowls.size,
            cachedBuffers: this.bufferCache.size,
            cachedWaveforms: this.waveformCache.size,
            activeSounds: this.activeSounds.size
        };
    }

    static resolvePath(filePath: string): string {
        let src = filePath;
        if (!filePath.startsWith('http') && !filePath.startsWith('media://')) {
            if (filePath.startsWith('file://')) {
                src = filePath.replace('file://', 'media://');
            } else {
                src = `media://${filePath.startsWith('/') ? '' : '/'}${filePath}`;
            }
        }
        return src;
    }
}

export const AudioEngine = new AudioEngineService();
