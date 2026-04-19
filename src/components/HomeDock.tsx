import React from 'react';
import { AppIcon } from './AppIcon';

interface HomeDockProps {
  onOpenPhone?: () => void;
  isStandalonePwa?: boolean;
}

export const HomeDock: React.FC<HomeDockProps> = ({
  onOpenPhone,
  isStandalonePwa = false,
}) => {
  return (
    <div
      className="absolute inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: isStandalonePwa ? '42px' : '18px' }}
    >
      <div className="glass flex w-[92%] items-end justify-around rounded-[2.5rem] px-4 py-3">
        <div className="flex h-[72px] w-full items-center justify-around">
          <AppIcon name="Phone" icon="Phone" onClick={onOpenPhone} />
          <AppIcon name="Safari" icon="Compass" />
          <AppIcon name="Messages" icon="MessageCircle" />
          <AppIcon name="Camera" icon="Camera" />
        </div>
      </div>
    </div>
  );
};
