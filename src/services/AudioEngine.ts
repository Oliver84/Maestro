import { Howl } from 'howler';

class AudioEngineService {
    private currentHowl: Howl | null = null;
    private currentDeviceId: string = 'default';

    setDeviceId(deviceId: string) {
        this.currentDeviceId = deviceId;
        console.log(`Audio Output set to: ${deviceId}`);
        // Implementation of sinkId setting will depend on Howler/WebAudio support
        // For now, we just store it.
    }

    play(filePath: string, volume: number = 1.0) {
        // Stop previous if any
        if (this.currentHowl) {
            this.currentHowl.stop();
        }

        // In Electron, we might need to prefix with file:// if not already
        const src = filePath.startsWith('file://') ? filePath : `file://${filePath}`;

        this.currentHowl = new Howl({
            src: [src],
            volume,
            html5: true, // Use HTML5 Audio for streaming large files
            onend: () => {
                this.currentHowl = null;
            }
        });

        // Attempt to set sinkId if supported on the internal audio node
        // @ts-ignore
        if (this.currentHowl._sounds[0]?._node && typeof this.currentHowl._sounds[0]._node.setSinkId === 'function') {
            // @ts-ignore
            this.currentHowl._sounds[0]._node.setSinkId(this.currentDeviceId)
                .catch((e: any) => console.error('Failed to set audio device', e));
        }

        this.currentHowl.play();
    }

    stop() {
        if (this.currentHowl) {
            const duration = 300;
            this.currentHowl.fade(this.currentHowl.volume(), 0, duration);
            setTimeout(() => {
                this.currentHowl?.stop();
                this.currentHowl = null;
            }, duration);
        }
    }
}

export const AudioEngine = new AudioEngineService();
