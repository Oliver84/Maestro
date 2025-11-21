import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Cue {
    id: string;
    sequence: number;
    title: string;
    oscCommand: string;
    audioFilePath: string;
    audioVolume: number;
    color?: string;
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
    updateCue: (id: string, data: Partial<Cue>) => void;
    reorderCues: (fromIndex: number, toIndex: number) => void;
    fireCue: (id: string) => void;
    stopAll: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    cues: [],
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
            ...cueData,
        };
        return { cues: [...state.cues, newCue] };
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
        set({ activeCueId: id });
        // Audio and OSC triggering will be handled by subscribers or components
    },

    stopAll: () => {
        set({ activeCueId: null });
    }
}));
