import React, { useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { X32Channel } from '../../store/useAppStore';

export const ChannelImporter: React.FC = () => {
    const { x32Channels, selectedChannelIds, setSelectedChannels, settings } = useAppStore();
    const [discovering, setDiscovering] = useState(false);
    const [selectedForImport, setSelectedForImport] = useState<number[]>(selectedChannelIds);

    const handleDiscover = async () => {
        setDiscovering(true);

        // Simulate discovery delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In simulation mode, channels are already loaded from mockData
        // In real mode, this would query the X32

        setDiscovering(false);
    };

    const toggleChannelSelection = (channelNumber: number) => {
        setSelectedForImport(prev =>
            prev.includes(channelNumber)
                ? prev.filter(n => n !== channelNumber)
                : [...prev, channelNumber]
        );
    };

    const handleImport = () => {
        setSelectedChannels(selectedForImport);
    };

    const selectAll = () => {
        setSelectedForImport(x32Channels.map(ch => ch.number));
    };

    const selectNone = () => {
        setSelectedForImport([]);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-700">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-200">X32 Channel Discovery</h3>
                    <button
                        onClick={handleDiscover}
                        disabled={discovering}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded transition-colors"
                    >
                        <RefreshCw size={14} className={discovering ? 'animate-spin' : ''} />
                        {discovering ? 'Discovering...' : 'Discover Channels'}
                    </button>
                </div>

                {settings.simulationMode && (
                    <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
                        ⚠️ Simulation Mode - Using mock X32 data
                    </div>
                )}
            </div>

            {/* Channel List */}
            <div className="flex-1 overflow-y-auto p-4">
                {x32Channels.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">
                        No channels discovered. Click "Discover Channels" to scan the X32.
                    </div>
                ) : (
                    <>
                        {/* Bulk Actions */}
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={selectAll}
                                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                            >
                                Select All
                            </button>
                            <span className="text-slate-600">|</span>
                            <button
                                onClick={selectNone}
                                className="text-xs text-slate-400 hover:text-slate-300 font-medium"
                            >
                                Select None
                            </button>
                            <span className="text-slate-600 ml-auto text-xs">
                                {selectedForImport.length} of {x32Channels.length} selected
                            </span>
                        </div>

                        {/* Channel Table */}
                        <div className="space-y-1">
                            {x32Channels.map((channel) => {
                                const isSelected = selectedForImport.includes(channel.number);
                                return (
                                    <div
                                        key={channel.number}
                                        onClick={() => toggleChannelSelection(channel.number)}
                                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${isSelected
                                                ? 'bg-emerald-500/20 border border-emerald-500/40'
                                                : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800'
                                            }`}
                                    >
                                        {/* Checkbox */}
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected
                                                ? 'bg-emerald-500 border-emerald-500'
                                                : 'border-slate-600'
                                            }`}>
                                            {isSelected && <Check size={14} className="text-white" />}
                                        </div>

                                        {/* Channel Number */}
                                        <div className="w-8 text-center text-xs font-mono font-bold text-slate-400">
                                            {channel.number}
                                        </div>

                                        {/* Channel Name */}
                                        <div className="flex-1 text-sm font-medium text-slate-200">
                                            {channel.name}
                                        </div>

                                        {/* Fader Level */}
                                        <div className="w-16 text-xs font-mono text-slate-500">
                                            {(channel.faderLevel * 100).toFixed(0)}%
                                        </div>

                                        {/* Mute Status */}
                                        <div className={`w-12 text-xs font-bold ${channel.muted ? 'text-red-400' : 'text-emerald-400'
                                            }`}>
                                            {channel.muted ? 'MUTE' : 'ON'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
                <button
                    onClick={handleImport}
                    disabled={selectedForImport.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold rounded transition-colors"
                >
                    Import {selectedForImport.length} Channel{selectedForImport.length !== 1 ? 's' : ''} to Quick Mix
                </button>
            </div>
        </div>
    );
};
