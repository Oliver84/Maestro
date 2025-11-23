import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface LogEntry {
    timestamp: string;
    message: string;
}

export interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'action';
    duration?: number;
}

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
    channelState?: Record<number, { faderLevel: number; muted: boolean }>;
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
    showToasts?: boolean;
}

interface AppState {
    cues: Cue[];
    activeCueId: string | null;
    selectedCueId: string | null;
    lastFiredAt: number;
    showStartTime: number | null; // When the first cue was fired
    showPausedTime: number; // Total time paused (accumulated)
    showPausedAt: number | null; // When pause started (null if not paused)
    isPaused: boolean; // Global pause state
    settings: AppSettings;
    x32Channels: X32Channel[];
    channelMeters: Record<number, number>;
    selectedChannelIds: number[];

    setAudioDevice: (id: string) => void;
    setX32Ip: (ip: string) => void;
    setSimulationMode: (enabled: boolean) => void;
    setShowImage: (image: string) => void;
    setShowToasts: (enabled: boolean) => void;
    setX32Channels: (channels: X32Channel[]) => void;
    initializeEmptyChannels: () => void;
    setSelectedChannels: (channelNumbers: number[]) => void;
    updateChannelFader: (channelNumber: number, level: number) => void;
    updateChannelMute: (channelNumber: number, muted: boolean) => void;
    updateChannelFromOsc: (channelNumber: number, type: 'fader' | 'mute' | 'name', value: any) => void;
    updateBulkChannelMeters: (levels: number[]) => void;
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
    panic: () => void; // Toggle Pause/Stop
    resume: () => void; // Resume from pause
    resetShowTimer: () => void;

    logs: LogEntry[];
    addLog: (message: string) => void;
    clearLogs: () => void;

    toasts: ToastMessage[];
    addToast: (message: string, type?: 'success' | 'error' | 'info' | 'action', duration?: number) => void;
    dismissToast: (id: string) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            cues: [], // Initial state is empty, no mock data
            activeCueId: null,
            selectedCueId: null, // Initialize selection
            lastFiredAt: 0,
            showStartTime: null, // Initialize show timer
            showPausedTime: 0, // No time paused initially
            showPausedAt: null, // Not paused initially
            isPaused: false,
            settings: {
                x32Ip: '192.168.1.50',
                audioDeviceId: 'default',
                simulationMode: true, // Default to simulation mode
                showToasts: true, // Default to showing toasts
            },
            x32Channels: [],
            channelMeters: {},
            selectedChannelIds: [],

            setAudioDevice: (id) => {
                set((state) => ({ settings: { ...state.settings, audioDeviceId: id } }));
                import('../services/AudioEngine').then(({ AudioEngine }) => {
                    AudioEngine.setOutputDevice(id);
                });
            },
            setX32Ip: (ip) => {
                set((state) => ({ settings: { ...state.settings, x32Ip: ip } }));
                import('../services/OscClient').then(({ getOscClient }) => {
                    getOscClient().updateConnection(ip);
                });
            },
            setSimulationMode: (enabled) => {
                set((state) => ({ settings: { ...state.settings, simulationMode: enabled } }));
                import('../services/OscClient').then(({ getOscClient }) => {
                    getOscClient().setSimulationMode(enabled);
                });
            },
            setShowImage: (image: string) => set((state) => ({ settings: { ...state.settings, showImage: image } })),
            setShowToasts: (enabled) => set((state) => ({ settings: { ...state.settings, showToasts: enabled } })),

            setX32Channels: (channels) => set({ x32Channels: channels }),
            setSelectedChannels: (channelNumbers) => set({ selectedChannelIds: channelNumbers }),

            initializeEmptyChannels: () => set((state) => {
                if (state.x32Channels.length === 32) return {}; // Already initialized
                const emptyChannels: X32Channel[] = Array.from({ length: 32 }, (_, i) => ({
                    number: i + 1,
                    name: `Ch ${i + 1}`,
                    faderLevel: 0,
                    muted: true
                }));
                return { x32Channels: emptyChannels };
            }),

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

            updateChannelFromOsc: (channelNumber, type, value) => set((state) => {
                return {
                    x32Channels: state.x32Channels.map(ch => {
                        if (ch.number === channelNumber) {
                            if (type === 'fader') return { ...ch, faderLevel: value };
                            if (type === 'mute') return { ...ch, muted: value };
                            if (type === 'name') return { ...ch, name: value };
                        }
                        return ch;
                    })
                };
            }),

            updateBulkChannelMeters: (levels) => set(() => {
                // Convert array to record for easier access by channel number (1-based)
                const newMeters: Record<number, number> = {};
                levels.forEach((level, index) => {
                    newMeters[index + 1] = level;
                });
                return { channelMeters: newMeters };
            }),

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

            selectCue: (id) => {
                set({ selectedCueId: id });

                // Pre-buffer the selected cue's audio
                const state = get();
                const cue = state.cues.find(c => c.id === id);
                if (cue?.audioFilePath) {
                    import('../services/AudioEngine').then(({ AudioEngine }) => {
                        AudioEngine.preloadAudio(cue.audioFilePath).catch(err => {
                            console.error('[Store] Failed to preload audio:', err);
                        });
                    });
                }
            },

            selectNextCue: () => {
                const { cues, selectedCueId } = get();
                if (!selectedCueId && cues.length > 0) {
                    set({ selectedCueId: cues[0].id });
                    // Pre-buffer first cue
                    if (cues[0].audioFilePath) {
                        import('../services/AudioEngine').then(({ AudioEngine }) => {
                            AudioEngine.preloadAudio(cues[0].audioFilePath).catch(err => {
                                console.error('[Store] Failed to preload audio:', err);
                            });
                        });
                    }
                    return;
                }
                const currentIndex = cues.findIndex(c => c.id === selectedCueId);
                if (currentIndex !== -1 && currentIndex < cues.length - 1) {
                    const nextCue = cues[currentIndex + 1];
                    set({ selectedCueId: nextCue.id });
                    // Pre-buffer next cue
                    if (nextCue.audioFilePath) {
                        import('../services/AudioEngine').then(({ AudioEngine }) => {
                            AudioEngine.preloadAudio(nextCue.audioFilePath).catch(err => {
                                console.error('[Store] Failed to preload audio:', err);
                            });
                        });
                    }
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

                const now = Date.now();

                // Set show start time if this is the first cue fired
                let showStartTime = state.showStartTime;
                let showPausedTime = state.showPausedTime;

                if (!showStartTime) {
                    // New show start - reset everything
                    showStartTime = now;
                    showPausedTime = 0;
                } else {
                    // Resuming existing show
                    // If resuming from pause, accumulate the paused time
                    if (state.showPausedAt !== null) {
                        const pauseDuration = now - state.showPausedAt;
                        showPausedTime += pauseDuration;
                    }
                }

                set({
                    activeCueId: id,
                    selectedCueId: id,
                    lastFiredAt: now,
                    showStartTime,
                    showPausedTime,
                    showPausedAt: null, // Resume (not paused)
                    isPaused: false
                });
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

                    // Send Generic OSC Command if present
                    // Check if it's a duplicate snippet command to avoid double firing
                    if (cue.oscCommand) {
                        const hasSnippet = cue.snippetId !== null && cue.snippetId !== undefined;
                        const isDuplicateSnippet = hasSnippet && cue.oscCommand.trim() === `/action/gosnippet ${cue.snippetId}`;
                        // Also check for the legacy default value that might be stuck in old cues
                        const isLegacyDefault = cue.oscCommand.trim() === '/action/gosnippet 1' && cue.snippetId !== 1;

                        if (!isDuplicateSnippet && !isLegacyDefault) {
                            oscClient.sendCustomCommand(cue.oscCommand);
                        }
                    }

                    // Send X32 Snippet if present
                    if (cue.snippetId !== null && cue.snippetId !== undefined) {
                        oscClient.sendCustomCommand(`/action/gosnippet ${cue.snippetId}`);
                    }

                    // Apply saved channel state if present
                    if (cue.channelState) {
                        // Optimistically update store to reflect changes in UI immediately
                        set((state) => ({
                            x32Channels: state.x32Channels.map(ch => {
                                const savedState = cue.channelState![ch.number];
                                if (savedState) {
                                    return { ...ch, faderLevel: savedState.faderLevel, muted: savedState.muted };
                                }
                                return ch;
                            })
                        }));

                        Object.entries(cue.channelState).forEach(([channelNumStr, state]) => {
                            const channelNum = parseInt(channelNumStr);
                            if (!isNaN(channelNum)) {
                                oscClient.setChannelFader(channelNum, state.faderLevel);
                                oscClient.setChannelMute(channelNum, state.muted);
                            }
                        });
                    }
                });
            },

            stopAll: () => {
                console.log('[Store] Stopping all playback and pausing show timer');

                // Pause show timer (don't reset)
                set({ showPausedAt: Date.now(), isPaused: false }); // Reset isPaused because we are fully stopped

                // Stop audio playback
                import('../services/AudioEngine').then(({ AudioEngine }) => {
                    AudioEngine.stopAll();
                });
            },

            panic: () => {
                const state = get();
                if (state.isPaused) {
                    // If paused, RESUME
                    console.log('[Store] Panic: Resuming');
                    state.resume();
                } else {
                    // If playing (or stopped), PAUSE
                    // Only pause if we are actually playing something? 
                    // For now, just toggle state to be safe.
                    console.log('[Store] Panic: Pausing');
                    set({ isPaused: true, showPausedAt: Date.now() });
                    import('../services/AudioEngine').then(({ AudioEngine }) => {
                        AudioEngine.pauseAll();
                    });
                }
            },

            resume: () => {
                const state = get();
                if (state.isPaused) {
                    console.log('[Store] Resuming');
                    const now = Date.now();
                    let showPausedTime = state.showPausedTime;
                    if (state.showPausedAt !== null) {
                        showPausedTime += (now - state.showPausedAt);
                    }

                    set({
                        isPaused: false,
                        showPausedAt: null,
                        showPausedTime
                    });

                    import('../services/AudioEngine').then(({ AudioEngine }) => {
                        AudioEngine.resumeAll();
                    });
                }
            },

            resetShowTimer: () => {
                console.log('[Store] Resetting show timer');
                set({ showStartTime: null });
            },

            logs: [],
            addLog: (message) => set((state) => {
                const now = new Date();
                const timestamp = now.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                const newLogs = [
                    ...state.logs,
                    { timestamp, message }
                ];

                // Keep last 100 logs
                return {
                    logs: newLogs.slice(-100)
                };
            }),
            clearLogs: () => set({ logs: [] }),

            toasts: [],
            addToast: (message, type = 'info', duration = 3000) => set((state) => {
                // Check if toasts are enabled in settings (default to true if undefined)
                if (state.settings.showToasts === false) return {};

                return {
                    toasts: [
                        ...state.toasts,
                        { id: uuidv4(), message, type, duration }
                    ]
                };
            }),
            dismissToast: (id) => set((state) => ({
                toasts: state.toasts.filter(t => t.id !== id)
            })),
        }),
        {
            name: 'maestro-store',
            partialize: (state) => ({
                cues: state.cues,
                settings: state.settings,
                selectedCueId: state.selectedCueId,
                x32Channels: state.x32Channels,
                selectedChannelIds: state.selectedChannelIds,
            }),
        }
    )
);
