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
    playbackMode?: 'STOP_AND_GO' | 'OVERLAP';
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
    showImage?: string;
}

interface AppState {
    cues: Cue[];
    activeCueId: string | null;
    selectedCueId: string | null;
    lastFiredAt: number;
    settings: AppSettings;
    x32Channels: X32Channel[];
    selectedChannelIds: number[];

    setAudioDevice: (id: string) => void;
    setX32Ip: (ip: string) => void;
    setSimulationMode: (enabled: boolean) => void;
    setShowImage: (image: string) => void;
    setX32Channels: (channels: X32Channel[]) => void;
    setSelectedChannels: (channelNumbers: number[]) => void;
    updateChannelFader: (channelNumber: number, level: number) => void;
    updateChannelMute: (channelNumber: number, muted: boolean) => void;
    addCue: (cue: Omit<Cue, 'id' | 'sequence'>) => void;
    deleteCue: (id: string) => void;
    updateCue: (id: string, data: Partial<Cue>) => void;
    reorderCues: (fromIndex: number, toIndex: number) => void;

    // Navigation Actions
    selectCue: (id: string) => void;
    selectNextCue: () => void;
    selectPreviousCue: () => void;

    fireCue: (id: string) => void;
    stopAll: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            cues: [], // Initial state is empty, no mock data
            activeCueId: null,
            selectedCueId: null, // Initialize selection
            lastFiredAt: 0,
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
            setShowImage: (image: string) => set((state) => ({ settings: { ...state.settings, showImage: image } })),

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
                    playbackMode: 'STOP_AND_GO', // Default mode
                    ...cueData,
                };
                const newCues = [...state.cues, newCue];
                // Auto-select the first cue added if none selected
                return {
                    cues: newCues,
                    selectedCueId: state.selectedCueId || newCue.id
                };
            }),

            deleteCue: (id) => set((state) => {
                const newCues = state.cues
                    .filter(c => c.id !== id)
                    .map((c, i) => ({ ...c, sequence: i + 1 })); // Re-sequence

                // Handle selection if deleted cue was selected
                let newSelectedId = state.selectedCueId;
                if (state.selectedCueId === id) {
                    const index = state.cues.findIndex(c => c.id === id);
                    if (newCues.length > 0) {
                        // Select next available, or last if at end
                        const nextIndex = Math.min(index, newCues.length - 1);
                        newSelectedId = newCues[nextIndex].id;
                    } else {
                        newSelectedId = null;
                    }
                }

                return { cues: newCues, selectedCueId: newSelectedId };
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

            selectCue: (id) => set({ selectedCueId: id }),

            selectNextCue: () => {
                const { cues, selectedCueId } = get();
                if (!selectedCueId && cues.length > 0) {
                    set({ selectedCueId: cues[0].id });
                    return;
                }
                const currentIndex = cues.findIndex(c => c.id === selectedCueId);
                if (currentIndex !== -1 && currentIndex < cues.length - 1) {
                    set({ selectedCueId: cues[currentIndex + 1].id });
                }
            },

            selectPreviousCue: () => {
                const { cues, selectedCueId } = get();
                if (!selectedCueId && cues.length > 0) {
                    set({ selectedCueId: cues[0].id });
                    return;
                }
                const currentIndex = cues.findIndex(c => c.id === selectedCueId);
                if (currentIndex > 0) {
                    set({ selectedCueId: cues[currentIndex - 1].id });
                }
            },

            fireCue: (id) => {
                const state = get();
                const cue = state.cues.find(c => c.id === id);

                if (!cue) {
                    console.warn(`[Store] Cue ${id} not found`);
                    return;
                }

                set({ activeCueId: id, selectedCueId: id, lastFiredAt: Date.now() });
                console.log(`[Store] Firing cue: ${cue.title}`);

                // Advance selection to next cue (Auto-step)
                const currentIndex = state.cues.findIndex(c => c.id === id);
                if (currentIndex !== -1 && currentIndex < state.cues.length - 1) {
                    set({ selectedCueId: state.cues[currentIndex + 1].id });
                }

                // Import AudioEngine dynamically to avoid circular dependencies
                import('../services/AudioEngine').then(({ AudioEngine }) => {
                    // Handle Playback Mode for ALL cues
                    // If mode is STOP_AND_GO (or undefined/default), stop previous sounds.
                    console.log(`[Store] Playback mode for "${cue.title}": ${cue.playbackMode || 'undefined (defaults to STOP_AND_GO)'}`);

                    if (cue.playbackMode !== 'OVERLAP') {
                        console.log('[Store] Stopping all previous audio (STOP_AND_GO mode)');
                        AudioEngine.stopAll();
                    } else {
                        console.log('[Store] Keeping previous audio playing (OVERLAP mode)');
                    }

                    // Play audio if file path is specified
                    if (cue.audioFilePath) {
                        AudioEngine.play(cue.audioFilePath, {
                            cueId: cue.id,
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
                    AudioEngine.stopAll();
                });
            }
        }),
        {
            name: 'maestro-store',
            partialize: (state) => ({
                cues: state.cues,
                settings: state.settings,
                selectedCueId: state.selectedCueId // Persist selection too
            }),
        }
    )
);
