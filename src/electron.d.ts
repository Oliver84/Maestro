export interface IElectronAPI {
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    off: (channel: string, listener: (...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    setX32Ip: (ip: string) => void;
    sendOsc: (address: string, ...args: any[]) => void;
    showSaveDialog: () => Promise<string | null>;
    saveFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
    showOpenDialog: () => Promise<{ filePath: string; content: string } | null>;
}

declare global {
    interface Window {
        ipcRenderer: IElectronAPI
    }
}
