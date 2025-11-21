import React from 'react';
import { ActiveCueDisplay } from './ActiveCueDisplay';
import { NextCueCard } from './NextCueCard';
import { TransportControls } from './TransportControls';
import { LastFired } from './LastFired';

export const Dashboard: React.FC = () => {
    return (
        <div className="flex-1 p-6 flex flex-col">
            <ActiveCueDisplay />
            <NextCueCard />
            <TransportControls />
            <LastFired />
        </div>
    );
};
