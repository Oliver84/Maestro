import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Cue {
    id: string;
    sequence: number;
    title: string;
    oscCommand: string;
    audioFilePath: string;
    audioVolume: number;
    color?: string;
    scene?: string;
    snippetId?: number | null;
}

export interface X32Channel {
    number: number;
    name: string;
    faderLevel: number;
    muted: boolean;
}

export interface AppSettings {
    x32Ip: string;
    audioDeviceId: string;
    simulationMode: boolean;
}

interface AppState {
    cues: Cue[];
    activeCueId: string | null;
    settings: AppSettings;
    x32Channels: X32Channel[];
    selectedChannelIds: number[];

    setAudioDevice: (id: string) => void;
    setX32Ip: (ip: string) => void;
    setSimulationMode: (enabled: boolean) => void;
    setX32Channels: (channels: X32Channel[]) => void;
    setSelectedChannels: (channelNumbers: number[]) => void;
    updateChannelFader: (channelNumber: number, level: number) => void;
    updateChannelMute: (channelNumber: number, muted: boolean) => void;
    addCue: (cue: Omit<Cue, 'id' | 'sequence'>) => void;
    deleteCue: (id: string) => void;
    updateCue: (id: string, data: Partial<Cue>) => void;
    reorderCues: (fromIndex: number, toIndex: number) => void;
    fireCue: (id: string) => void;
    stopAll: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            cues: [], // Initial state is empty, no mock data
            activeCueId: null,
            settings: {
                x32Ip: '192.168.1.50',
                audioDeviceId: 'default',
                simulationMode: true, // Default to simulation mode
            },
            x32Channels: [],
            selectedChannelIds: [],

            setAudioDevice: (id) => set((state) => ({ settings: { ...state.settings, audioDeviceId: id } })),
            setX32Ip: (ip) => set((state) => ({ settings: { ...state.settings, x32Ip: ip } })),
            setSimulationMode: (enabled) => set((state) => ({ settings: { ...state.settings, simulationMode: enabled } })),

            setX32Channels: (channels) => set({ x32Channels: channels }),
            setSelectedChannels: (channelNumbers) => set({ selectedChannelIds: channelNumbers }),

            updateChannelFader: (channelNumber, level) => set((state) => ({
                x32Channels: state.x32Channels.map(ch =>
                    ch.number === channelNumber ? { ...ch, faderLevel: level } : ch
                )
            })),

            updateChannelMute: (channelNumber, muted) => set((state) => ({
                x32Channels: state.x32Channels.map(ch =>
                    ch.number === channelNumber ? { ...ch, muted } : ch
                )
            })),

            addCue: (cueData) => set((state) => {
                const newCue: Cue = {
                    id: uuidv4(),
                    sequence: state.cues.length + 1,
                    scene: '',
                    snippetId: null,
                    ...cueData,
                };
                return { cues: [...state.cues, newCue] };
            }),

            deleteCue: (id) => set((state) => {
                const newCues = state.cues
                    .filter(c => c.id !== id)
                    .map((c, i) => ({ ...c, sequence: i + 1 })); // Re-sequence
                return { cues: newCues };
            }),

            updateCue: (id, data) => set((state) => ({
                cues: state.cues.map((cue) => cue.id === id ? { ...cue, ...data } : cue)
            })),

            reorderCues: (fromIndex, toIndex) => set((state) => {
                const newCues = [...state.cues];
                const [movedCue] = newCues.splice(fromIndex, 1);
                newCues.splice(toIndex, 0, movedCue);
                // Re-sequence
                return { cues: newCues.map((c, i) => ({ ...c, sequence: i + 1 })) };
            }),

            fireCue: (id) => {
                const state = useAppStore.getState();
                const cue = state.cues.find(c => c.id === id);

                if (!cue) {
                    console.warn(`[Store] Cue ${id} not found`);
                    return;
                }

                set({ activeCueId: id });
                console.log(`[Store] Firing cue: ${cue.title}`);

                // Import AudioEngine dynamically to avoid circular dependencies
                import('../services/AudioEngine').then(({ AudioEngine }) => {
                    // Play audio if file path is specified
                    if (cue.audioFilePath) {
                        AudioEngine.play(cue.audioFilePath, {
                            volume: cue.audioVolume,
                            onEnd: () => {
                                console.log(`[Store] Audio finished for cue: ${cue.title}`);
                            },
                            onError: (error) => {
                                console.error(`[Store] Audio error for cue: ${cue.title}`, error);
                            }
                        });
                    }
                });

                // Import OscClient dynamically to send OSC commands
                import('../services/OscClient').then(({ getOscClient }) => {
                    const oscClient = getOscClient();
                    if (!state.settings.simulationMode) {
                        // Send Generic OSC Command if present
                        if (cue.oscCommand) {
                            oscClient.sendCustomCommand(cue.oscCommand);
                        }
                        // Send X32 Snippet if present
                        if (cue.snippetId) {
                            // Behringer X32 command for loading a snippet: /-action/gosnippet {id}
                            // Or /action/gosnippet (depending on firmware/docs, but usually /action/gosnippet)
                            // The mock client usually expects specific formats, but for real OSC:
                            // The library node-osc sends arguments.
                            // We'll construct a command string for now as the generic handler does.
                            oscClient.sendCustomCommand(`/action/gosnippet ${cue.snippetId}`);
                        }
                    }
                });
            },

            stopAll: () => {
                console.log('[Store] Stopping all playback');
                // We intentionally DO NOT reset activeCueId here so the user knows where they are.
                // set({ activeCueId: null });

                // Stop audio playback
                import('../services/AudioEngine').then(({ AudioEngine }) => {
                    AudioEngine.stop();
                });
            }
        }),
        {
            name: 'maestro-store',
            partialize: (state) => ({
                cues: state.cues,
                settings: state.settings,
                // We don't persist activeCueId or channels/faders as those should reset or be re-fetched
            }),
        }
    )
);
