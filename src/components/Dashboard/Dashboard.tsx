import React from 'react';
import { ActiveCueDisplay } from './ActiveCueDisplay';
import { GoButton } from './GoButton';
import { TransportControls } from './TransportControls';
import { LastFired } from './LastFired';

export const Dashboard: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                <ActiveCueDisplay />
                <div className="mt-auto flex gap-4 items-stretch h-40 shrink-0">
                    <div className="flex-1 min-w-0">
                        <GoButton />
                    </div>
                    <div className="w-24 shrink-0">
                        <TransportControls />
                    </div>
                </div>
            </div>
            <div className="p-6 pt-0 shrink-0">
                <LastFired />
            </div>
        </div>
    );
};
