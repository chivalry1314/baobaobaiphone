import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { useContactsSnapshot, useUpdateContact } from '../../contacts/selectors';
import { useWeChatStore } from '../store';

interface EditCharacterViewProps {
  characterId: string;
  onBack: () => void;
}

const normalizePatSuffix = (value?: string): string => {
  const raw = (value || '').trim();
  if (!raw || raw === '鐨勮偐鑶€') {
    return '的肩膀';
  }
  return raw;
};

export const EditCharacterView: React.FC<EditCharacterViewProps> = ({ characterId, onBack }) => {
  const contacts = useContactsSnapshot();
  const updateContact = useUpdateContact();
  const { wechatContactExtensions, setWeChatContactPatSuffix } = useWeChatStore();

  const contact = contacts.find((item) => item.id === characterId);

  const [avatar, setAvatar] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [patSuffix, setPatSuffix] = useState('的肩膀');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const backTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!contact) return;
    setAvatar(contact.avatar || '');
    setName(contact.name || '');
    setDescription(contact.description || contact.note || '');
    setPatSuffix(normalizePatSuffix(wechatContactExtensions[characterId]?.patSuffix));
  }, [characterId, contact, wechatContactExtensions]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (backTimerRef.current) {
        window.clearTimeout(backTimerRef.current);
      }
    },
    []
  );

  if (!contact) return null;

  const isFormValid = name.trim().length > 0;

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
        const context = canvas.getContext('2d');
        if (!context) return;

        context.drawImage(image, 0, 0, width, height);
        setAvatar(canvas.toDataURL('image/jpeg', 0.8));
      };
      image.src = String(loadEvent.target?.result ?? '');
    };
    reader.readAsDataURL(file);
  };

  const handleBack = () => {
    onBack();
  };

  const handleSave = () => {
    if (!isFormValid) return;

    updateContact(characterId, {
      name: name.trim(),
      avatar: avatar.trim(),
      description: description.trim(),
    });
    setWeChatContactPatSuffix(characterId, normalizePatSuffix(patSuffix));

    setToastMessage('保存成功');

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2000);

    if (backTimerRef.current) {
      window.clearTimeout(backTimerRef.current);
    }
    backTimerRef.current = window.setTimeout(() => {
      onBack();
    }, 700);
  };

  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 bg-[#EDEDED] flex flex-col z-[60]"
    >
      <div className="bg-[#F7F7F7] px-4 pt-12 pb-3 flex items-center border-b border-gray-200 shrink-0">
        <button onClick={handleBack} className="text-[#07C160] flex items-center -ml-1 active:opacity-50">
          <ChevronLeft size={28} />
          <span className="text-[17px]">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900">朋友资料</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isFormValid}
          className={`text-[15px] px-2 py-1 rounded-md ${
            isFormValid ? 'text-[#07C160] active:opacity-70' : 'text-gray-300'
          }`}
        >
          保存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-4 pb-10">
        <div className="flex flex-col items-center mb-6 px-4">
          <button
            onClick={handleAvatarClick}
            className="w-20 h-20 bg-white rounded-xl flex items-center justify-center cursor-pointer overflow-hidden border border-gray-100 active:bg-gray-50"
          >
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={36} className="text-gray-300" />
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </div>

        <div className="bg-white border-t border-b border-gray-200 mb-6">
          <div className="flex items-center px-4 py-3 border-b border-gray-100">
            <label className="text-[16px] text-gray-900 w-24 shrink-0">昵称</label>
            <input
              type="text"
              placeholder="必填"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="flex-1 text-[16px] text-gray-900 outline-none placeholder:text-gray-300"
            />
          </div>

          <div className="flex items-center px-4 py-3 border-b border-gray-100">
            <label className="text-[16px] text-gray-900 w-24 shrink-0">拍一拍</label>
            <input
              type="text"
              placeholder="例如：的肩膀"
              value={patSuffix}
              onChange={(event) => setPatSuffix(event.target.value)}
              className="flex-1 text-[16px] text-gray-900 outline-none placeholder:text-gray-300"
            />
          </div>

          <div className="p-4">
            <label className="block text-[16px] text-gray-900 mb-2">描述</label>
            <textarea
              placeholder="介绍这个联系人"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full text-[16px] text-gray-900 outline-none placeholder:text-gray-300 resize-none"
              rows={4}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toastMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[120px] left-1/2 z-[200] bg-black/70 text-white px-5 py-2.5 rounded-[8px] text-[15px] whitespace-nowrap shadow-md flex items-center gap-2"
          >
            <Check size={18} strokeWidth={2.5} />
            {toastMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};


