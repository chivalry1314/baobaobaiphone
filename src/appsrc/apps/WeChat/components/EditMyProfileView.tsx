import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, QrCode, User as UserIcon } from 'lucide-react';
import { useWeChatStore } from '../store';

interface EditMyProfileViewProps {
  onBack: () => void;
  onEditName: () => void;
  onEditPatSetting: () => void;
}

interface RowItemProps {
  label: string;
  value?: string;
  onClick?: () => void;
  isAvatar?: boolean;
  hasQrCode?: boolean;
  border?: boolean;
}

const normalizePatSuffix = (value?: string): string => {
  const raw = (value || '').trim();
  if (!raw || raw === '鐨勮偐鑶€') {
    return '的肩膀';
  }
  return raw;
};

export const EditMyProfileView: React.FC<EditMyProfileViewProps> = ({
  onBack,
  onEditName,
  onEditPatSetting,
}) => {
  const { wechatUserProfile, updateWeChatUserProfile } = useWeChatStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 256;
        const maxHeight = 256;
        let width = image.width;
        let height = image.height;

        if (width > height && width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else if (height >= width && height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(image, 0, 0, width, height);
        updateWeChatUserProfile({ avatar: canvas.toDataURL('image/jpeg', 0.8) });
      };
      image.src = loadEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const RowItem: React.FC<RowItemProps> = ({
    label,
    value,
    onClick,
    isAvatar,
    hasQrCode,
    border = true,
  }) => (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3.5 bg-white active:bg-gray-50 ${
        border ? 'border-b border-gray-100' : ''
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <span className="text-[16px] text-gray-900">{label}</span>
      <div className="flex items-center gap-2">
        {isAvatar ? (
          <div className="w-14 h-14 bg-gray-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-gray-400">
            {wechatUserProfile.avatar ? (
              <img src={wechatUserProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={24} />
            )}
          </div>
        ) : (
          <span className="text-[16px] text-gray-500">{value}</span>
        )}
        {hasQrCode && <QrCode size={18} className="text-gray-400" />}
        <ChevronRight size={20} className="text-gray-300" />
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 bg-[#EDEDED] flex flex-col z-[60]"
    >
      <div className="bg-[#F7F7F7] px-2 pt-12 pb-2.5 flex items-center border-b border-gray-200 shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
          <ChevronLeft size={30} strokeWidth={1.5} />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900 pr-8">个人信息</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mt-2 border-t border-b border-gray-200">
          <RowItem label="头像" isAvatar onClick={handleAvatarClick} />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
          <RowItem label="名字" value={wechatUserProfile.name} onClick={onEditName} />
          <RowItem
            label="拍一拍"
            value={normalizePatSuffix(wechatUserProfile.patSuffix)}
            onClick={onEditPatSetting}
          />
          <RowItem label="微信号" value={wechatUserProfile.wechatId} onClick={() => {}} />
          <RowItem label="二维码名片" hasQrCode onClick={() => {}} />
          <RowItem label="更多" onClick={() => {}} border={false} />
        </div>

        <div className="mt-2 border-t border-b border-gray-200">
          <RowItem label="来电铃声" onClick={() => {}} />
          <RowItem label="微信豆" onClick={() => {}} border={false} />
        </div>

        <div className="mt-2 border-t border-b border-gray-200">
          <RowItem label="我的地址" onClick={() => {}} border={false} />
        </div>
      </div>
    </motion.div>
  );
};
