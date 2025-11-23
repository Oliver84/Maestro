import { useAppStore } from '../store/useAppStore';
import type { X32Channel } from '../store/useAppStore';

// Initialize mock X32 channels for simulation mode
export const initializeMockChannels = () => {
    const mockChannels: X32Channel[] = [
        { number: 1, name: 'Narrator 1', faderLevel: 0.0, muted: false },
        { number: 2, name: 'Narrator 2', faderLevel: 0.0, muted: false },
        { number: 3, name: 'Mary', faderLevel: 0.0, muted: false },
        { number: 4, name: 'Joseph', faderLevel: 0.3, muted: false },
        { number: 5, name: 'Roman-Angel', faderLevel: 0.2, muted: false },
        { number: 6, name: 'Soloist 1', faderLevel: 0.0, muted: false },
        { number: 7, name: 'Soloist 2', faderLevel: 0.0, muted: false },
        { number: 8, name: 'Shepard 1', faderLevel: 0.0, muted: false },
        { number: 9, name: 'Shepard 2', faderLevel: 0.0, muted: false },
        { number: 10, name: 'Shepard 3', faderLevel: 0.0, muted: false },
    ];

    useAppStore.getState().setX32Channels(mockChannels);
    // Select all 6 channels by default to test layout
    useAppStore.getState().setSelectedChannels([1, 2, 3, 4, 5, 6]);
};

// Initialize mock cues for testing
export const initializeMockCues = () => {
    const { addCue } = useAppStore.getState();

    // Add sample cues
    addCue({
        title: 'Opening Music',
        oscCommand: '/ch/01/mix/on 1',
        audioFilePath: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        audioVolume: 0.8,
        color: '#10b981'
    });

    addCue({
        title: 'Narrator 1 - Introduction',
        oscCommand: '/ch/01/mix/fader 0.75',
        audioFilePath: '',
        audioVolume: 1.0,
        color: '#3b82f6'
    });

    addCue({
        title: 'Scene 1 - Mary & Angel',
        oscCommand: '/ch/03/mix/on 1',
        audioFilePath: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        audioVolume: 0.7,
        color: '#8b5cf6'
    });

    console.log('[Mock Data] Initialized 3 sample cues');
};
