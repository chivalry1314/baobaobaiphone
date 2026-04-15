import React from 'react';
import {
  Aperture,
  ChevronRight,
  Eye,
  MapPin,
  Package,
  Scan,
  Search,
  Smartphone,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WeChatDiscoverProps } from '../types';

interface RowItemProps {
  icon: LucideIcon;
  label: string;
  color: string;
  border?: boolean;
  onClick?: () => void;
}

export const WeChatDiscover: React.FC<WeChatDiscoverProps> = ({ onMomentsClick }) => {
  const RowItem: React.FC<RowItemProps> = ({ icon: Icon, label, color, border = true, onClick }) => (
    <div
      onClick={onClick}
      className="flex items-center bg-white px-4 py-3.5 active:bg-gray-50 cursor-pointer"
    >
      <Icon size={24} className={color} strokeWidth={1.5} />
      <div
        className={`flex-1 flex items-center justify-between ml-4 ${
          border ? 'border-b border-gray-100' : ''
        } pb-3.5 -mb-3.5`}
      >
        <span className="text-[16px] text-gray-900">{label}</span>
        <ChevronRight size={20} className="text-gray-300" />
      </div>
    </div>
  );

  return (
    <div className="pb-8">
      <div className="mt-2 border-t border-b border-gray-200">
        <RowItem
          icon={Aperture}
          label="朋友圈"
          color="text-[#576B95]"
          border={false}
          onClick={onMomentsClick}
        />
      </div>

      <div className="mt-2 border-t border-b border-gray-200">
        <RowItem icon={Video} label="视频号" color="text-[#E78F26]" border={false} />
      </div>

      <div className="mt-2 border-t border-b border-gray-200">
        <RowItem icon={Scan} label="扫一扫" color="text-[#3B82F6]" />
        <RowItem icon={Smartphone} label="摇一摇" color="text-[#3B82F6]" border={false} />
      </div>

      <div className="mt-2 border-t border-b border-gray-200">
        <RowItem icon={Eye} label="看一看" color="text-[#F59E0B]" />
        <RowItem icon={Search} label="搜一搜" color="text-[#EF4444]" border={false} />
      </div>

      <div className="mt-2 border-t border-b border-gray-200">
        <RowItem icon={MapPin} label="附近" color="text-[#3B82F6]" border={false} />
      </div>

      <div className="mt-2 mb-4 border-t border-b border-gray-200">
        <RowItem icon={Package} label="小程序" color="text-[#8B5CF6]" border={false} />
      </div>
    </div>
  );
};
