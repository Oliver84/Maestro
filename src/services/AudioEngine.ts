import { Howl, Howler } from 'howler';

export interface AudioPlaybackOptions {
    volume?: number; // 0.0 to 1.0
    loop?: boolean;
    onEnd?: () => void;
    onError?: (error: any) => void;
}

class AudioEngineService {
    // Track active sounds. Map<src, Howl> or just a Set<Howl>.
    // We use Set because multiple instances of same src might theoretically play,
    // though in this app cue paths are keys.
    private activeSounds: Set<Howl> = new Set();

    // We track the "primary" or "last fired" sound for progress display purposes
    private primaryHowl: Howl | null = null;

    private currentDeviceId: string = 'default';
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

    getWaveformData(): Uint8Array | null {
        if (this.analyser && this.dataArray) {
            this.analyser.getByteTimeDomainData(this.dataArray);
            return this.dataArray;
        }
        return null;
    }

    getFrequencyData(): Uint8Array | null {
        if (this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            return this.dataArray;
        }
        return null;
    }

    setDeviceId(deviceId: string) {
        this.currentDeviceId = deviceId;
        console.log(`[Audio Engine] Audio device set to: ${deviceId}`);
    }

    setMasterVolume(volume: number) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        // Update all active sounds
        this.activeSounds.forEach(sound => {
            sound.volume(this.masterVolume);
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

        console.log(`[Audio Engine] Playing: ${src} at volume ${volume}`);

        const sound = new Howl({
            src: [src],
            volume,
            html5: false,
            format: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'],
            loop: options.loop || false,
            onend: () => {
                console.log(`[Audio Engine] Playback finished: ${src}`);
                this.activeSounds.delete(sound);
                if (this.primaryHowl === sound) {
                    this.primaryHowl = null;
                }
                if (options.onEnd) {
                    options.onEnd();
                }
            },
            onloaderror: (id, error) => {
                console.error(`[Audio Engine] Load error for ${src}:`, error);
                this.activeSounds.delete(sound);
                if (options.onError) {
                    options.onError(error);
                }
            },
            onplayerror: (id, error) => {
                console.error(`[Audio Engine] Play error for ${src}:`, error);
                this.activeSounds.delete(sound);
                if (options.onError) {
                    options.onError(error);
                }
            }
        });

        this.activeSounds.add(sound);
        this.primaryHowl = sound;
        sound.play();
    }

    stopAll() {
        const duration = 300;
        console.log('[Audio Engine] Stopping all playback with fade out');

        this.activeSounds.forEach(sound => {
            sound.fade(sound.volume(), 0, duration);
            setTimeout(() => {
                sound.stop();
                sound.unload();
                this.activeSounds.delete(sound);
            }, duration);
        });
        this.primaryHowl = null;
    }

    isPlaying(): boolean {
        // Return true if ANY sound is playing
        return this.activeSounds.size > 0;
    }

    getCurrentTime(): number {
        // Return time of the "primary" (most recently fired) sound
        if (this.primaryHowl) {
            return this.primaryHowl.seek() as number;
        }
        return 0;
    }

    getDuration(): number {
        if (this.primaryHowl) {
            return this.primaryHowl.duration();
        }
        return 0;
    }
}

export const AudioEngine = new AudioEngineService();
