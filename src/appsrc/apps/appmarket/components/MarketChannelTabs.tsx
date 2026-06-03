import React from 'react';

import { CHANNEL_LABELS } from '../constants';
import type { MarketChannel } from '../uiTypes';

interface MarketChannelTabsProps {
  activeChannel: MarketChannel;
  onChange: (channel: MarketChannel) => void;
}

const CHANNELS: MarketChannel[] = ['apps', 'themes'];

export const MarketChannelTabs: React.FC<MarketChannelTabsProps> = ({
  activeChannel,
  onChange,
}) => {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 rounded-[22px] bg-slate-100/85 p-1.5">
      {CHANNELS.map((channel) => {
        const isActive = activeChannel === channel;
        return (
          <button
            key={channel}
            type="button"
            onClick={() => onChange(channel)}
            className={`h-10 rounded-[18px] text-[14px] font-semibold transition ${
              isActive
                ? 'bg-white text-slate-900 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.42)]'
                : 'text-slate-500'
            }`}
          >
            {CHANNEL_LABELS[channel]}
          </button>
        );
      })}
    </div>
  );
};
