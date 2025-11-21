/**
 * Browser-compatible OSC Client
 * This is a lightweight client that works in the browser for simulation mode.
 * For production with real X32, this should be replaced with Electron IPC calls
 * to a main process OSC client.
 */

export class BrowserOscClient {
    private host: string;
    private port: number;
    private isConnected: boolean = false;

    constructor(host: string = '192.168.1.50', port: number = 10023) {
        this.host = host;
        this.port = port;
    }

    /**
     * Connect to the X32 console
     */
    connect(): void {
        this.isConnected = true;
        console.log(`[OSC Client] Simulated connection to X32 at ${this.host}:${this.port}`);
    }

    /**
     * Disconnect from the X32 console
     */
    disconnect(): void {
        this.isConnected = false;
        console.log('[OSC Client] Disconnected from X32');
    }

    /**
     * Send a raw OSC message (simulated)
     */
    private send(address: string, ...args: any[]): void {
        if (!this.isConnected) {
            console.warn('[OSC Client] Not connected. Cannot send message:', address);
            return;
        }

        console.log(`[OSC Client] Would send: ${address}`, args);
    }

    /**
     * Set channel fader level
     * @param channelNumber Channel number (1-32)
     * @param level Fader level (0.0 to 1.0)
     */
    setChannelFader(channelNumber: number, level: number): void {
        const address = `/ch/${String(channelNumber).padStart(2, '0')}/mix/fader`;
        this.send(address, level);
    }

    /**
     * Set channel mute status
     * @param channelNumber Channel number (1-32)
     * @param muted true = muted, false = unmuted
     */
    setChannelMute(channelNumber: number, muted: boolean): void {
        const address = `/ch/${String(channelNumber).padStart(2, '0')}/mix/on`;
        // X32 uses 1 for ON (unmuted) and 0 for OFF (muted)
        this.send(address, muted ? 0 : 1);
    }

    /**
     * Get channel name
     * @param channelNumber Channel number (1-32)
     */
    getChannelName(channelNumber: number): void {
        const address = `/ch/${String(channelNumber).padStart(2, '0')}/config/name`;
        this.send(address);
    }

    /**
     * Get channel fader level
     * @param channelNumber Channel number (1-32)
     */
    getChannelFader(channelNumber: number): void {
        const address = `/ch/${String(channelNumber).padStart(2, '0')}/mix/fader`;
        this.send(address);
    }

    /**
     * Get channel mute status
     * @param channelNumber Channel number (1-32)
     */
    getChannelMute(channelNumber: number): void {
        const address = `/ch/${String(channelNumber).padStart(2, '0')}/mix/on`;
        this.send(address);
    }

    /**
     * Send a custom OSC command
     * @param command OSC address path
     * @param args Optional arguments
     */
    sendCustomCommand(command: string, ...args: any[]): void {
        this.send(command, ...args);
    }

    /**
     * Check if client is connected
     */
    getConnectionStatus(): boolean {
        return this.isConnected;
    }

    /**
     * Update connection settings
     */
    updateConnection(host: string, port: number = 10023): void {
        this.disconnect();
        this.host = host;
        this.port = port;
        this.connect();
    }
}

// Singleton instance
let oscClientInstance: BrowserOscClient | null = null;

export const getOscClient = (): BrowserOscClient => {
    if (!oscClientInstance) {
        oscClientInstance = new BrowserOscClient();
        oscClientInstance.connect(); // Auto-connect in simulation mode
    }
    return oscClientInstance;
};
