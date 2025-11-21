import { useAppStore } from '../store/useAppStore';
import type { X32Channel } from '../store/useAppStore';

// Initialize mock X32 channels for simulation mode
export const initializeMockChannels = () => {
    const mockChannels: X32Channel[] = [
        { number: 1, name: 'Pastor', faderLevel: 0.75, muted: false },
        { number: 2, name: 'Keys', faderLevel: 0.60, muted: false },
        { number: 3, name: 'Guitar', faderLevel: 0.50, muted: false },
        { number: 4, name: 'Bass', faderLevel: 0.65, muted: false },
        { number: 5, name: 'Drums OH L', faderLevel: 0.70, muted: false },
        { number: 6, name: 'Drums OH R', faderLevel: 0.70, muted: false },
        { number: 7, name: 'Kick', faderLevel: 0.80, muted: false },
        { number: 8, name: 'Snare', faderLevel: 0.75, muted: false },
        { number: 11, name: 'Spotify', faderLevel: 0.80, muted: false },
        { number: 12, name: 'Backing Trk', faderLevel: 0.65, muted: false },
        { number: 17, name: 'Main R', faderLevel: 0.00, muted: true },
        { number: 18, name: 'Main L', faderLevel: 0.00, muted: true },
    ];

    useAppStore.getState().setX32Channels(mockChannels);
    // Select first 4 channels by default
    useAppStore.getState().setSelectedChannels([1, 2, 11, 17]);
};
