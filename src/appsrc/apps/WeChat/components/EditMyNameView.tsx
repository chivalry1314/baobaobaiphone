import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { XCircle } from 'lucide-react';
import { useWeChatStore } from '../store';

interface EditMyNameViewProps {
  onBack: () => void;
}

export const EditMyNameView: React.FC<EditMyNameViewProps> = ({ onBack }) => {
  const { wechatUserProfile, updateWeChatUserProfile } = useWeChatStore();
  const [name, setName] = useState(wechatUserProfile.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    inputRef.current.setSelectionRange(name.length, name.length);
  }, []);

  const handleSave = () => {
    const nextName = name.trim();
    if (!nextName) return;
    updateWeChatUserProfile({ name: nextName });
    onBack();
  };

  const isChanged = name.trim() !== wechatUserProfile.name && name.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 bg-[#EDEDED] flex flex-col z-[70]"
    >
      <div className="bg-[#EDEDED] px-4 pt-12 pb-3 flex items-center shrink-0">
        <button onClick={onBack} className="text-gray-900 text-[17px] active:opacity-50">
          {'取消'}
        </button>
        <h1 className="flex-1 text-center text-[17px] font-medium text-gray-900">{'更改名字'}</h1>
        <button
          onClick={handleSave}
          disabled={!isChanged}
          className={`text-[15px] font-medium px-3 py-1.5 rounded-md transition-colors ${
            isChanged ? 'bg-[#07C160] text-white active:bg-[#06ad56]' : 'bg-[#D3EFDF] text-[#86D8A7]'
          }`}
        >
          {'保存'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mt-4 bg-white flex items-center px-4 py-3 border-y border-gray-200">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="flex-1 text-[16px] text-gray-900 outline-none placeholder:text-gray-300"
            placeholder={'请输入名字'}
          />
          {name.length > 0 && (
            <button onClick={() => setName('')} className="ml-2 p-1 active:opacity-50">
              <XCircle size={20} className="text-gray-300 fill-gray-300 text-white" />
            </button>
          )}
        </div>

        <div className="px-4 mt-2 text-[13px] text-gray-500">
          {'好名字可以让你的朋友更容易记住你。'}
        </div>
      </div>
    </motion.div>
  );
};
