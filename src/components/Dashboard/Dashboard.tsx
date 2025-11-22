import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ActiveCueDisplay } from './ActiveCueDisplay';
import { GoButton } from './GoButton';
import { TransportControls } from './TransportControls';
import { LastFired } from './LastFired';

export const Dashboard: React.FC = () => {
    const [isLogsCollapsed, setIsLogsCollapsed] = useState(false);

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <PanelGroup direction="vertical" className="flex-1">
                <Panel defaultSize={75} minSize={40}>
                    <div className="h-full overflow-y-auto p-6 flex flex-col gap-4">
                        <ActiveCueDisplay />
                        <div className="mt-auto flex gap-4 items-center h-40 shrink-0">
                            <div className="flex-1 min-w-0">
                                <GoButton />
                            </div>
                            <div className="w-24 shrink-0 h-full flex items-center">
                                <TransportControls />
                            </div>
                        </div>
                    </div>
                </Panel>

                {!isLogsCollapsed && (
                    <>
                        <PanelResizeHandle className="h-1 bg-slate-800 hover:bg-emerald-500/50 transition-colors cursor-row-resize mx-6" />
                        <Panel defaultSize={25} minSize={10} maxSize={50}>
                            <div className="h-full px-6 pb-6 overflow-hidden flex flex-col">
                                <LastFired />
                            </div>
                        </Panel>
                    </>
                )}
            </PanelGroup>

            {/* Collapse/Expand Toggle */}
            <button
                onClick={() => setIsLogsCollapsed(!isLogsCollapsed)}
                className="h-6 bg-slate-900 border-t border-slate-800 hover:bg-slate-800 transition-colors flex items-center justify-center text-slate-500 hover:text-emerald-400 group"
                title={isLogsCollapsed ? "Show Logs" : "Hide Logs"}
            >
                {isLogsCollapsed ? (
                    <ChevronUp size={16} className="transition-transform" />
                ) : (
                    <ChevronDown size={16} className="transition-transform" />
                )}
            </button>
        </div>
    );
};
