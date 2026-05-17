import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, MoreHorizontal, MessageSquare, Video, ChevronRight, User } from 'lucide-react';
import { useWeChatCharactersFromContacts } from '../contactAdapter';
import { useUpdateContact } from '../../contacts/selectors';
import { useWeChatStore } from '../store';

interface ContactProfileViewProps {
  characterId: string;
  onBack: () => void;
  onSendMessage: (id: string) => void;
  onEditProfile: (id: string) => void;
  onMomentsClick: (id: string) => void;
  onDeleted?: () => void;
}

export const ContactProfileView: React.FC<ContactProfileViewProps> = ({ 
  characterId, 
  onBack, 
  onSendMessage, 
  onEditProfile,
  onMomentsClick,
  onDeleted,
}) => {
  const wechatCharacters = useWeChatCharactersFromContacts();
  const updateContact = useUpdateContact();
  const deleteWeChatContact = useWeChatStore((state) => state.deleteWeChatContact);
  const [showSettings, setShowSettings] = React.useState(false);
  const character = wechatCharacters.find(c => c.id === characterId);

  if (!character) return null;

  const handleDeleteContact = () => {
    const confirmed = window.confirm(`删除联系人“${character.name}”？`);
    if (!confirmed) return;
    updateContact(character.id, { wechatRelation: 'deleted' });
    deleteWeChatContact(character.id);
    onDeleted?.();
  };

  const RowItem = ({ label, onClick, hasArrow = true }: { label: string, onClick?: () => void, hasArrow?: boolean }) => (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3.5 bg-white active:bg-gray-50 border-b border-gray-100 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <span className="text-[16px] text-gray-900">{label}</span>
      {hasArrow && <ChevronRight size={20} className="text-gray-300" />}
    </div>
  );

  const ToggleRow = ({ label, checked }: { label: string; checked: boolean }) => (
    <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
      <span className="text-[17px] text-gray-900">{label}</span>
      <div
        className={`w-[52px] h-[30px] rounded-full p-[2px] transition-colors ${
          checked ? 'bg-[#07C160]' : 'bg-[#E5E5E5]'
        }`}
      >
        <div
          className={`w-[26px] h-[26px] bg-white rounded-full shadow-sm transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );

  if (showSettings) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-[#EDEDED] flex flex-col z-50"
      >
        <div className="bg-[#F7F7F7] px-2 pt-12 pb-3 flex items-center shrink-0 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="text-gray-900 flex items-center active:opacity-50"
          >
            <ChevronLeft size={30} strokeWidth={1.5} />
          </button>
          <h1 className="flex-1 text-center text-[18px] font-semibold text-gray-900">设置</h1>
          <div className="w-[42px]" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mb-2">
            <RowItem label="编辑备注" onClick={() => {}} />
            <RowItem label="设置权限" onClick={() => {}} />
          </div>

          <div className="mb-2">
            <RowItem label={`把${character.name}推荐给朋友`} onClick={() => {}} />
          </div>

          <div className="mb-2">
            <ToggleRow label="设为星标朋友" checked />
            <ToggleRow label="加入黑名单" checked={false} />
          </div>

          <div className="mb-2">
            <RowItem label="投诉" onClick={() => {}} />
          </div>

          <button
            type="button"
            onClick={handleDeleteContact}
            className="w-full bg-white py-4 text-center text-[17px] text-[#FA5151] active:bg-gray-50"
          >
            删除联系人
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 bg-[#EDEDED] flex flex-col z-50"
    >
      {/* 顶部导航 */}
      <div className="bg-white px-2 pt-12 pb-2 flex items-center shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
          <ChevronLeft size={30} strokeWidth={1.5} />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="text-gray-900 active:opacity-50 px-2"
        >
          <MoreHorizontal size={26} strokeWidth={1.5} />
        </button>
      </div>

      {/* 滚动内容区 */}
      <div className="flex-1 overflow-y-auto">
        {/* 头部资料卡片 */}
        <div className="bg-white px-5 pt-2 pb-8 flex items-start gap-5 mb-2">
          <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center text-gray-400">
            {character.avatar ? (
              <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <User size={36} />
            )}
          </div>
          <div className="flex-1 pt-1">
            <h1 className="text-[20px] font-semibold text-gray-900 mb-1">{character.name}</h1>
            <p className="text-[14px] text-gray-500 mb-1">微信号：wxid_{character.id.slice(0, 8)}</p>
            <p className="text-[14px] text-gray-500">地区：未知</p>
          </div>
        </div>

        {/* 资料与权限分组 */}
        <div className="mb-2">
          <RowItem label="朋友资料" onClick={() => onEditProfile(character.id)} />
          <RowItem label="权限" onClick={() => {}} />
        </div>

        {/* 朋友圈分组 */}
        <div className="mb-2">
          <RowItem label="朋友圈" onClick={() => onMomentsClick(character.id)} />
          <RowItem label="视频号" onClick={() => {}} hasArrow={false} />
        </div>

        {/* 底部操作按钮 */}
        <div className="bg-white flex flex-col mt-2">
          <button 
            onClick={() => onSendMessage(character.id)}
            className="flex items-center justify-center gap-2 py-3.5 border-b border-gray-100 active:bg-gray-50 transition-colors"
          >
            <MessageSquare size={20} className="text-[#576B95]" />
            <span className="text-[16px] font-medium text-[#576B95]">发消息</span>
          </button>
          <button 
            className="flex items-center justify-center gap-2 py-3.5 active:bg-gray-50 transition-colors"
          >
            <Video size={20} className="text-[#576B95]" />
            <span className="text-[16px] font-medium text-[#576B95]">音视频通话</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
