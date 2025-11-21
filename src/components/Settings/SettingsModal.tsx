import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, setX32Ip, setAudioDevice } = useAppStore();
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

    useEffect(() => {
        if (isOpen) {
            navigator.mediaDevices.enumerateDevices()
                .then(devs => setDevices(devs.filter(d => d.kind === 'audiooutput')))
                .catch(err => console.error('Failed to enumerate devices:', err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-slate-900 p-6 rounded-lg w-96 border border-slate-800 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">X32 IP Address</label>
                        <input
                            type="text"
                            value={settings.x32Ip}
                            onChange={(e) => setX32Ip(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                            placeholder="192.168.1.50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Audio Output Device</label>
                        <select
                            value={settings.audioDeviceId}
                            onChange={(e) => setAudioDevice(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                        >
                            <option value="default">Default System Output</option>
                            {devices.map(device => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Device ${device.deviceId.slice(0, 5)}...`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
