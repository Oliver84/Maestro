import { Howl } from 'howler';

export interface AudioPlaybackOptions {
    volume?: number; // 0.0 to 1.0
    loop?: boolean;
    onEnd?: () => void;
    onError?: (error: any) => void;
}

class AudioEngineService {
    private currentHowl: Howl | null = null;
    private currentDeviceId: string = 'default';
    private masterVolume: number = 1.0;

    setDeviceId(deviceId: string) {
        this.currentDeviceId = deviceId;
        console.log(`[Audio Engine] Audio device set to: ${deviceId}`);
        // Implementation of sinkId setting will depend on Howler/WebAudio support
        // For now, we just store it.
    }

    setMasterVolume(volume: number) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.currentHowl) {
            this.currentHowl.volume(this.masterVolume);
        }
        console.log(`[Audio Engine] Master volume set to: ${this.masterVolume}`);
    }

    play(filePath: string, options: AudioPlaybackOptions = {}) {
        // Stop previous if any
        if (this.currentHowl) {
            this.currentHowl.stop();
            this.currentHowl.unload();
        }

        // In Electron, we might need to prefix with file:// if not already
        const src = filePath.startsWith('file://') || filePath.startsWith('http')
            ? filePath
            : `file://${filePath}`;

        const volume = options.volume !== undefined ? options.volume : this.masterVolume;

        console.log(`[Audio Engine] Playing: ${filePath} at volume ${volume}`);

        this.currentHowl = new Howl({
            src: [src],
            volume,
            html5: true, // Use HTML5 Audio for streaming large files
            loop: options.loop || false,
            onend: () => {
                console.log(`[Audio Engine] Playback finished: ${filePath}`);
                this.currentHowl = null;
                if (options.onEnd) {
                    options.onEnd();
                }
            },
            onloaderror: (id, error) => {
                console.error(`[Audio Engine] Load error for ${filePath}:`, error);
                if (options.onError) {
                    options.onError(error);
                }
            },
            onplayerror: (id, error) => {
                console.error(`[Audio Engine] Play error for ${filePath}:`, error);
                if (options.onError) {
                    options.onError(error);
                }
            }
        });

        // Attempt to set sinkId if supported on the internal audio node
        // @ts-ignore
        if (this.currentHowl._sounds[0]?._node && typeof this.currentHowl._sounds[0]._node.setSinkId === 'function') {
            // @ts-ignore
            this.currentHowl._sounds[0]._node.setSinkId(this.currentDeviceId)
                .catch((e: any) => console.error('[Audio Engine] Failed to set audio device', e));
        }

        this.currentHowl.play();
    }

    stop() {
        if (this.currentHowl) {
            const duration = 300;
            console.log('[Audio Engine] Stopping playback with fade out');
            this.currentHowl.fade(this.currentHowl.volume(), 0, duration);
            setTimeout(() => {
                this.currentHowl?.stop();
                this.currentHowl?.unload();
                this.currentHowl = null;
            }, duration);
        }
    }

    pause() {
        if (this.currentHowl && this.currentHowl.playing()) {
            console.log('[Audio Engine] Pausing playback');
            this.currentHowl.pause();
        }
    }

    resume() {
        if (this.currentHowl && !this.currentHowl.playing()) {
            console.log('[Audio Engine] Resuming playback');
            this.currentHowl.play();
        }
    }

    isPlaying(): boolean {
        return this.currentHowl !== null && this.currentHowl.playing();
    }

    getCurrentTime(): number {
        if (this.currentHowl) {
            return this.currentHowl.seek() as number;
        }
        return 0;
    }

    getDuration(): number {
        if (this.currentHowl) {
            return this.currentHowl.duration();
        }
        return 0;
    }
}

export const AudioEngine = new AudioEngineService();
