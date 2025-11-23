import { useAppStore, AppState } from '../store/useAppStore';

export const ShowService = {
    saveShow: async (asNew: boolean = false) => {
        const store = useAppStore.getState();
        let filePath = store.currentShowFilePath;

        if (asNew || !filePath) {
            filePath = await window.ipcRenderer.showSaveDialog();
        }

        if (!filePath) return; // User cancelled

        const showData: Partial<AppState> = {
            cues: store.cues,
            settings: store.settings,
            x32Channels: store.x32Channels,
            selectedChannelIds: store.selectedChannelIds,
            // We don't save runtime state like activeCueId, logs, toasts, etc.
        };

        const content = JSON.stringify(showData, null, 2);
        const result = await window.ipcRenderer.saveFile(filePath, content);

        if (result.success) {
            store.setCurrentShowFilePath(filePath);
            store.addToast(`Show saved to ${filePath}`, 'success');
        } else {
            store.addToast(`Failed to save show: ${result.error}`, 'error');
        }
    },

    loadShow: async () => {
        const result = await window.ipcRenderer.showOpenDialog();
        if (!result) return; // User cancelled

        try {
            const showData = JSON.parse(result.content);
            const store = useAppStore.getState();

            // Validate basic structure (optional but good practice)
            if (!Array.isArray(showData.cues)) {
                throw new Error('Invalid show file format');
            }

            store.loadShowState(showData);
            store.setCurrentShowFilePath(result.filePath);
            store.addToast(`Show loaded from ${result.filePath}`, 'success');
        } catch (error) {
            console.error('Failed to parse show file:', error);
            useAppStore.getState().addToast('Failed to load show: Invalid file format', 'error');
        }
    },

    newShow: async () => {
        // TODO: Ask for confirmation if there are unsaved changes?
        // For now, just reset.
        const store = useAppStore.getState();
        store.resetShowState();
        store.setCurrentShowFilePath(null);
        store.addToast('New show created', 'info');
    }
};
