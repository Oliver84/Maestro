import { Server as OscServer } from 'node-osc';

export interface MockX32Channel {
    number: number;
    name: string;
    faderLevel: number;
    muted: boolean;
}

const MOCK_CHANNEL_NAMES = [
    'Pastor', 'Keys', 'Guitar', 'Bass', 'Drums OH L', 'Drums OH R',
    'Kick', 'Snare', 'Tom 1', 'Tom 2', 'Spotify', 'Backing Trk',
    'Choir 1', 'Choir 2', 'Choir 3', 'Choir 4', 'Main R', 'Main L',
    'Aux 1', 'Aux 2', 'Aux 3', 'Aux 4', 'FX 1', 'FX 2',
    'Monitor 1', 'Monitor 2', 'Monitor 3', 'Monitor 4', 'USB 1', 'USB 2',
    'Talkback', 'Click'
];

export class MockX32Server {
    private server: any = null;
    private channels: MockX32Channel[] = [];
    private port: number;

    constructor(port: number = 10023) {
        this.port = port;
        this.initializeChannels();
    }

    private initializeChannels() {
        // Create 32 mock channels with realistic data
        this.channels = Array.from({ length: 32 }, (_, i) => ({
            number: i + 1,
            name: MOCK_CHANNEL_NAMES[i] || `Channel ${i + 1}`,
            faderLevel: Math.random() * 0.8 + 0.1, // Random level between 0.1 and 0.9
            muted: Math.random() > 0.7 // 30% chance of being muted
        }));
    }

    start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.server = new OscServer(this.port, '0.0.0.0', () => {
                    console.log(`[Mock X32] Server listening on port ${this.port}`);
                    resolve();
                });

                this.server.on('message', (msg: any[]) => {
                    this.handleMessage(msg);
                });

                this.server.on('error', (err: Error) => {
                    console.error('[Mock X32] Server error:', err);
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    private handleMessage(msg: any[]) {
        const [address, ...args] = msg;
        console.log(`[Mock X32] Received: ${address}`, args);

        // Parse the OSC address to determine what's being queried/set
        if (typeof address === 'string') {
            // Channel name query: /ch/01/config/name
            const nameMatch = address.match(/^\/ch\/(\d+)\/config\/name$/);
            if (nameMatch) {
                const channelNum = parseInt(nameMatch[1], 10);
                this.respondChannelName(channelNum);
                return;
            }

            // Fader level query: /ch/01/mix/fader
            const faderMatch = address.match(/^\/ch\/(\d+)\/mix\/fader$/);
            if (faderMatch) {
                const channelNum = parseInt(faderMatch[1], 10);
                if (args.length > 0) {
                    // Setting fader level
                    this.setChannelFader(channelNum, args[0] as number);
                } else {
                    // Querying fader level
                    this.respondChannelFader(channelNum);
                }
                return;
            }

            // Mute status query: /ch/01/mix/on
            const muteMatch = address.match(/^\/ch\/(\d+)\/mix\/on$/);
            if (muteMatch) {
                const channelNum = parseInt(muteMatch[1], 10);
                if (args.length > 0) {
                    // Setting mute status
                    this.setChannelMute(channelNum, args[0] as number);
                } else {
                    // Querying mute status
                    this.respondChannelMute(channelNum);
                }
                return;
            }
        }
    }

    private respondChannelName(channelNum: number) {
        const channel = this.channels[channelNum - 1];
        if (channel) {
            console.log(`[Mock X32] Responding with channel ${channelNum} name: ${channel.name}`);
            // In a real implementation, we'd send this back to the client
            // For now, just log it
        }
    }

    private respondChannelFader(channelNum: number) {
        const channel = this.channels[channelNum - 1];
        if (channel) {
            console.log(`[Mock X32] Responding with channel ${channelNum} fader: ${channel.faderLevel}`);
        }
    }

    private respondChannelMute(channelNum: number) {
        const channel = this.channels[channelNum - 1];
        if (channel) {
            console.log(`[Mock X32] Responding with channel ${channelNum} mute: ${channel.muted ? 0 : 1}`);
        }
    }

    private setChannelFader(channelNum: number, level: number) {
        const channel = this.channels[channelNum - 1];
        if (channel) {
            channel.faderLevel = Math.max(0, Math.min(1, level));
            console.log(`[Mock X32] Set channel ${channelNum} fader to ${channel.faderLevel}`);
        }
    }

    private setChannelMute(channelNum: number, value: number) {
        const channel = this.channels[channelNum - 1];
        if (channel) {
            channel.muted = value === 0;
            console.log(`[Mock X32] Set channel ${channelNum} mute to ${channel.muted}`);
        }
    }

    getChannels(): MockX32Channel[] {
        return [...this.channels];
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log('[Mock X32] Server stopped');
        }
    }
}
