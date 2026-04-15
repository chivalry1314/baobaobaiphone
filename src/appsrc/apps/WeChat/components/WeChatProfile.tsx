import React from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Package,
  QrCode,
  Settings,
  Smile,
  Star,
  User as UserIcon,
  Video,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useWeChatStore } from '../store';
import type { WeChatProfileProps } from '../types';

interface RowProps {
  icon: LucideIcon;
  label: string;
  color: string;
  border?: boolean;
  onClick?: () => void;
  readOnly?: boolean;
}

const Row: React.FC<RowProps> = ({
  icon: Icon,
  label,
  color,
  border = true,
  onClick,
  readOnly = false,
}) => {
  const interactive = Boolean(onClick) && !readOnly;

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      className={`flex w-full items-center bg-white px-4 py-3.5 text-left ${
        interactive ? 'active:bg-gray-50 cursor-pointer' : 'cursor-default'
      }`}
    >
      <Icon size={24} className={color} strokeWidth={1.5} />
      <div
        className={`ml-4 flex flex-1 items-center justify-between pb-3.5 -mb-3.5 ${
          border ? 'border-b border-gray-100' : ''
        }`}
      >
        <span className="text-[16px] text-gray-900">{label}</span>
        <ChevronRight size={20} className="text-gray-300" />
      </div>
    </button>
  );
};

export const WeChatProfile: React.FC<WeChatProfileProps> = ({
  onClose,
  onEditProfile,
  onServicesClick,
  onMomentsClick,
  onSettingsClick,
  readOnly = false,
}) => {
  const { wechatUserProfile } = useWeChatStore();

  return (
    <div className="absolute inset-0 z-10 flex flex-col overflow-y-auto bg-[#EDEDED]">
      <div className="shrink-0 bg-white px-2 pb-2 pt-12 flex items-center justify-between">
        <button
          type="button"
          onClick={readOnly ? undefined : onClose}
          disabled={readOnly}
          className={`flex items-center text-gray-900 ${
            readOnly ? 'cursor-default opacity-55' : 'active:opacity-50'
          }`}
        >
          <ChevronLeft size={30} strokeWidth={1.5} />
          <span className="text-[17px]">返回</span>
        </button>
        <button
          type="button"
          disabled={readOnly}
          className={`px-2 text-gray-900 ${
            readOnly ? 'cursor-default opacity-55' : 'active:opacity-50'
          }`}
        >
          <Camera size={26} strokeWidth={1.5} />
        </button>
      </div>

      <button
        type="button"
        onClick={readOnly ? undefined : onEditProfile}
        disabled={readOnly}
        className={`w-full bg-white px-5 pb-8 pt-2 text-left flex items-center gap-4 ${
          readOnly ? 'cursor-default' : 'cursor-pointer active:bg-gray-50'
        }`}
      >
        <div className="w-16 h-16 shrink-0 overflow-hidden rounded-[14px] bg-gray-200 flex items-center justify-center text-gray-400">
          {wechatUserProfile.avatar ? (
            <img src={wechatUserProfile.avatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <UserIcon size={36} />
          )}
        </div>
        <div className="flex-1 pt-1">
          <h1 className="mb-1 text-[22px] font-semibold leading-none text-gray-900">
            {wechatUserProfile.name}
          </h1>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[15px] text-gray-500">微信号：{wechatUserProfile.wechatId}</span>
            <div className="flex items-center gap-2 text-gray-400">
              <QrCode size={16} />
              <ChevronRight size={20} />
            </div>
          </div>
        </div>
      </button>

      <div className="mt-2 border-b border-t border-gray-100">
        <Row
          icon={Wallet}
          label="服务"
          color="text-[#27A372]"
          border={false}
          onClick={onServicesClick}
          readOnly={readOnly}
        />
      </div>

      <div className="mt-2 border-b border-t border-gray-100">
        <Row icon={Star} label="收藏" color="text-[#F1B136]" readOnly={readOnly} />
        <Row
          icon={ImageIcon}
          label="朋友圈"
          color="text-[#576B95]"
          onClick={onMomentsClick}
          readOnly={readOnly}
        />
        <Row icon={Video} label="视频号" color="text-[#E78F26]" readOnly={readOnly} />
        <Row icon={Package} label="卡包" color="text-[#6484A9]" readOnly={readOnly} />
        <Row icon={Smile} label="表情" color="text-[#F1B136]" border={false} readOnly={readOnly} />
      </div>

      <div className="mt-2 mb-8 border-b border-t border-gray-100">
        <Row
          icon={Settings}
          label="设置"
          color="text-[#4E83C5]"
          border={false}
          onClick={onSettingsClick}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};

