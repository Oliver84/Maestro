import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ChannelImporter } from './ChannelImporter';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabType = 'general' | 'channels';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, setX32Ip, setAudioDevice, setSimulationMode, setShowImage, setShowToasts } = useAppStore();
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('general');

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
            <div className="bg-slate-900 rounded-lg w-[700px] h-[600px] border border-slate-800 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'general'
                            ? 'text-emerald-400 border-b-2 border-emerald-400'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('channels')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'channels'
                            ? 'text-emerald-400 border-b-2 border-emerald-400'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        X32 Channels
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'general' && (
                        <div className="p-6 space-y-6">
                            {/* Simulation Mode Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div>
                                    <div className="text-sm font-medium text-slate-200">Simulation Mode</div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Use mock X32 data for testing without hardware
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSimulationMode(!settings.simulationMode)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.simulationMode ? 'bg-amber-500' : 'bg-slate-600'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.simulationMode ? 'translate-x-6' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Show Toasts Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div>
                                    <div className="text-sm font-medium text-slate-200">Show Toast Notifications</div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Enable or disable popup notifications
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowToasts(settings.showToasts === false)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.showToasts !== false ? 'bg-emerald-500' : 'bg-slate-600'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.showToasts !== false ? 'translate-x-6' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* X32 IP Address */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-300">
                                    X32 IP Address
                                </label>
                                <input
                                    type="text"
                                    value={settings.x32Ip}
                                    onChange={(e) => setX32Ip(e.target.value)}
                                    disabled={settings.simulationMode}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="192.168.1.50"
                                />
                                {settings.simulationMode && (
                                    <p className="text-xs text-amber-400 mt-1">
                                        Disabled in simulation mode
                                    </p>
                                )}
                            </div>

                            {/* Audio Output Device */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-300">
                                    Audio Output Device
                                </label>
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

                            {/* Show Image */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-300">
                                    Show Image (Album Cover)
                                </label>
                                <div className="flex gap-4 items-start">
                                    {settings.showImage && (
                                        <div className="w-20 h-20 rounded bg-slate-950 border border-slate-700 overflow-hidden flex-shrink-0">
                                            <img
                                                src={settings.showImage}
                                                alt="Show Cover"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setShowImage(reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            className="block w-full text-sm text-slate-400
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-emerald-950 file:text-emerald-400
                                                hover:file:bg-emerald-900
                                                cursor-pointer"
                                        />
                                        <p className="text-xs text-slate-500 mt-2">
                                            Upload an image to display as the background for the active cue.
                                        </p>
                                        {settings.showImage && (
                                            <button
                                                onClick={() => setShowImage('')}
                                                className="text-xs text-red-400 hover:text-red-300 mt-2 underline"
                                            >
                                                Remove Image
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'channels' && (
                        <ChannelImporter />
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 flex justify-end">
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
