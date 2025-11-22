import React from 'react';
import { ActiveCueDisplay } from './ActiveCueDisplay';
import { GoButton } from './GoButton';
import { TransportControls } from './TransportControls';
import { LastFired } from './LastFired';

export const Dashboard: React.FC = () => {
    return (
        <div className="flex-1 p-6 flex flex-col gap-4">
            <ActiveCueDisplay />
            <div className="mt-auto space-y-4">
                <GoButton />
                <TransportControls />
                <LastFired />
            </div>
        </div>
    );
};
