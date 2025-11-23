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

export class AudioEngineService {
    // Track active sounds with metadata
    private activeSounds: Map<string, ActiveSound> = new Map();

    // We track the "primary" or "last fired" sound for progress display purposes
    private primaryCueId: string | null = null;

    private masterVolume: number = 1.0;
    public analyser: AnalyserNode | null = null;
    private bufferLength: number = 0;
    private dataArray: Uint8Array | null = null;

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

    async setOutputDevice(deviceId: string) {
        if (Howler.ctx && (Howler.ctx as any).setSinkId) {
            try {
                // 'default' is the standard ID for the default device
                const sinkId = deviceId === 'default' ? '' : deviceId;
                await (Howler.ctx as any).setSinkId(sinkId);
                console.log(`[Audio Engine] Output device set to: ${deviceId}`);
            } catch (error) {
                console.error('[Audio Engine] Failed to set output device:', error);
            }
        } else {
            console.warn('[Audio Engine] setSinkId not supported in this environment');
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
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume().then(() => {
                console.log('[Audio Engine] AudioContext resumed');
            });
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
