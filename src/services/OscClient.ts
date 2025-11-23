/**
 * Browser-compatible OSC Client
 * This is a lightweight client that works in the browser for simulation mode.
 * For production with real X32, this uses Electron IPC calls to a main process OSC client.
 */

export class BrowserOscClient {
    private host: string;
    private port: number;
    private isConnected: boolean = false;
    private simulationMode: boolean = false;
    private logCallback: ((msg: string) => void) | null = null;
    private heartbeatInterval: any = null;
    private meterInterval: any = null;

    constructor(host: string = '192.168.1.50', port: number = 10023) {
        this.host = host;
        this.port = port;

        // Setup Listener for Incoming OSC Messages
        if (window.ipcRenderer) {
            window.ipcRenderer.on('osc-message', (_event: any, msg: any[]) => {
                this.handleOscMessage(msg);
            });
        }
    }

    setSimulationMode(enabled: boolean) {
        this.simulationMode = enabled;
        console.log(`[OSC Client] Simulation mode set to: ${enabled}`);
    }

    setLogCallback(callback: (msg: string) => void) {
        this.logCallback = callback;
    }

    /**
     * Connect to the X32 console
     */
    connect(): void {
        this.isConnected = true;

        // Initialize Electron-side OSC Client if available
        if (window.ipcRenderer) {
            window.ipcRenderer.setX32Ip(this.host);
        }

        console.log(`[OSC Client] Connected to X32 at ${this.host}:${this.port}`);
        this.startHeartbeat();
        this.startMeterPolling();
        this.syncFromConsole();
    }

    /**
     * Disconnect from the X32 console
     */
    disconnect(): void {
        this.isConnected = false;
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.meterInterval) {
            clearInterval(this.meterInterval);
            this.meterInterval = null;
        }
        console.log('[OSC Client] Disconnected from X32');
    }

    /**
     * Start sending /xremote every 9 seconds to keep subscription alive
     */
    private startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

        // Send immediately
        this.send('/xremote');

        // Then every 9 seconds
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send('/xremote');
            }
        }, 9000);
    }

    /**
     * Poll meters every 100ms
     */
    private startMeterPolling() {
        if (this.meterInterval) clearInterval(this.meterInterval);

        this.meterInterval = setInterval(() => {
            if (this.isConnected) {
                // Request meters for Input Channels (block 1)
                this.send('/meters', '/meters/1');
            }
        }, 100);
    }

    /**
     * Request initial state from console
     */
    private syncFromConsole() {
        // Send /xremote again just in case
        this.send('/xremote');

        // We could loop through channels, but /xremote usually triggers a dump or we can listen to changes.
        // For now, we'll rely on the heartbeat keeping us subscribed.
        console.log('[OSC Client] Synced (subscribed) to console updates');
    }

    /**
     * Handle incoming OSC messages
     */
    private handleOscMessage(msg: any[]) {
        const [address, ...args] = msg;

        // Log reception (skip meters to avoid spam)
        if (this.logCallback && address !== '/meters/1') {
            this.logCallback(`[IN] ${address} ${args.join(' ')}`);
        }

        // Dynamic import to avoid circular dependency during initialization
        import('../store/useAppStore').then(({ useAppStore }) => {
            const store = useAppStore.getState();

            // Parse Meters: /meters/1 <blob>
            if (address === '/meters/1' && args.length > 0) {
                const blob = args[0];
                if (blob instanceof Uint8Array || Buffer.isBuffer(blob)) {
                    const floatArray = new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
                    // Convert to array
                    const levels = Array.from(floatArray);
                    store.updateBulkChannelMeters(levels);
                }
                return;
            }

            // Parse Channel Fader: /ch/01/mix/fader <value>
            const faderMatch = typeof address === 'string' ? address.match(/^\/ch\/(\d+)\/mix\/fader$/) : null;
            if (faderMatch) {
                const channelNum = parseInt(faderMatch[1], 10);
                const value = args[0] as number;
                store.updateChannelFromOsc(channelNum, 'fader', value);
                return;
            }

            // Parse Channel Mute: /ch/01/mix/on <value>
            const muteMatch = typeof address === 'string' ? address.match(/^\/ch\/(\d+)\/mix\/on$/) : null;
            if (muteMatch) {
                const channelNum = parseInt(muteMatch[1], 10);
                const value = args[0] as number;
                // value 0 = muted (OFF), 1 = unmuted (ON)
                // But updateChannelFromOsc expects 'muted' boolean where true = muted
                // so if value is 0 (OFF), muted is true.
                // if value is 1 (ON), muted is false.
                store.updateChannelFromOsc(channelNum, 'mute', value === 0);
                return;
            }

            // Parse Channel Name: /ch/01/config/name <value>
            const nameMatch = typeof address === 'string' ? address.match(/^\/ch\/(\d+)\/config\/name$/) : null;
            if (nameMatch) {
                const channelNum = parseInt(nameMatch[1], 10);
                const value = args[0] as string;
                store.updateChannelFromOsc(channelNum, 'name', value);
                return;
            }
        });
    }

    /**
     * Send a raw OSC message (via IPC if available)
     */
    private send(address: string, ...args: any[]): void {
        if (!this.isConnected) {
            console.warn('[OSC Client] Not connected. Cannot send message:', address);
            return;
        }

        // Always use IPC if available, regardless of "simulationMode" flag logic used for other things.
        // If we are in Electron, we want to use the main process socket.
        if (window.ipcRenderer && !this.simulationMode) {
            // Use Electron IPC for real UDP transport
            window.ipcRenderer.sendOsc(address, ...args);
        }

        // Skip logging for meters to avoid spam
        if (address !== '/meters') {
            const message = `${address} ${args.map(a => typeof a === 'number' ? a.toFixed(2) : a).join(' ')}`;
            console.log(`[OSC Client] Sent: ${message}`);

            if (this.logCallback) {
                this.logCallback(`[OUT] ${message}`);
            }
        }
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
        // Correction: /mix/on usually takes 1 (active/on) or 0 (inactive/off).
        // If the button is "Mute", then muted=true means on=0.
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
        // Handle space-separated commands if arguments are not passed separately
        // e.g., "/action/gosnippet 12"
        if (args.length === 0 && command.includes(' ')) {
            const parts = command.split(' ');
            const address = parts[0];
            const oscArgs = parts.slice(1).map(arg => {
                // Try to convert numeric strings to numbers
                const num = parseFloat(arg);
                return isNaN(num) ? arg : num;
            });
            this.send(address, ...oscArgs);
        } else {
            this.send(command, ...args);
        }
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
