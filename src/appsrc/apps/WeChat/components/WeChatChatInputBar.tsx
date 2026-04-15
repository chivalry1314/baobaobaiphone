import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  Radio,
  Smile,
  Plus,
  Image as ImageIcon,
  Camera,
  Forward,
  Box,
  Trash2,
  Mail,
  Maximize,
  XCircle,
  ArrowRightLeft,
  Video,
} from 'lucide-react';

interface WeChatChatInputBarProps {
  readOnly?: boolean;
  isSelectionMode: boolean;
  selectedCount: number;
  inputValue: string;
  hasVoiceDraft: boolean;
  isTyping: boolean;
  isVoiceRecording: boolean;
  isVoiceBusy: boolean;
  isMultiline: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  showPlusMenu: boolean;
  setShowPlusMenu: (show: boolean) => void;
  quotingMessage: { senderName: string; content: string } | null;
  setQuotingMessage: (val: null) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onShowTransfer: () => void;
  onShowCallOptions: () => void;
  onChooseImage: () => void;
  onTakePhoto: () => void;
  onShowFullScreenEditor: () => void;
  onToggleVoiceInput: () => void;
  onOpenVoiceRecorder: () => void;
  onForwardMulti: () => void;
  onDeleteMulti: () => void;
}

export const WeChatChatInputBar: React.FC<WeChatChatInputBarProps> = ({
  readOnly = false,
  isSelectionMode,
  selectedCount,
  inputValue,
  hasVoiceDraft,
  isTyping,
  isVoiceRecording,
  isVoiceBusy,
  isMultiline,
  textareaRef,
  showPlusMenu,
  setShowPlusMenu,
  quotingMessage,
  setQuotingMessage,
  onSend,
  onKeyDown,
  onInputChange,
  onShowTransfer,
  onShowCallOptions,
  onChooseImage,
  onTakePhoto,
  onShowFullScreenEditor,
  onToggleVoiceInput,
  onOpenVoiceRecorder,
  onForwardMulti,
  onDeleteMulti,
}) => {
  if (readOnly) {
    return (
      <div className="bg-[#F7F7F7] border-t border-gray-200 px-4 py-3 shrink-0 pb-safe">
        <p className="text-[13px] text-gray-500 text-center">查手机模式：仅可查看聊天记录</p>
      </div>
    );
  }

  if (isSelectionMode) {
    return (
      <div className="bg-[#F7F7F7] border-t border-gray-200 px-6 py-2 flex items-center justify-between shrink-0 pb-safe">
        <button
          onClick={onForwardMulti}
          disabled={selectedCount === 0}
          className={`p-2 transition-opacity ${
            selectedCount > 0 ? 'text-gray-800 active:opacity-50' : 'text-gray-300'
          }`}
        >
          <Forward size={24} strokeWidth={1.5} />
        </button>
        <button className="text-gray-800 active:opacity-50 p-2">
          <Box size={24} strokeWidth={1.5} />
        </button>
        <button
          onClick={onDeleteMulti}
          disabled={selectedCount === 0}
          className={`p-2 transition-opacity ${
            selectedCount > 0 ? 'text-gray-800 active:opacity-50' : 'text-gray-300'
          }`}
        >
          <Trash2 size={24} strokeWidth={1.5} />
        </button>
        <button className="text-gray-800 active:opacity-50 p-2">
          <Mail size={24} strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F7F7] border-t border-gray-200 flex flex-col shrink-0 pb-safe">
      <div className="px-1.5 py-2 flex flex-col">
        <div className="flex items-end gap-1 w-full min-w-0">
          <div className="flex flex-col justify-end shrink-0 mb-0.5 w-[42px] sm:w-[52px] items-start">
            <AnimatePresence>
              {isMultiline && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 10 }}
                  transition={{ duration: 0.15 }}
                  onClick={onShowFullScreenEditor}
                  className="text-gray-500 hover:text-gray-700 active:opacity-50 p-1 w-[40px] sm:w-[46px] h-[32px] flex items-center justify-center mb-1"
                >
                  <Maximize size={22} strokeWidth={1.5} />
                </motion.button>
              )}
            </AnimatePresence>
            <button
              onClick={onOpenVoiceRecorder}
              className="w-[42px] h-[42px] sm:w-[50px] sm:h-[50px] rounded-full bg-transparent text-[#2f3135] flex items-center justify-center transition-transform active:scale-95 shrink-0"
              type="button"
              aria-label="语音模式"
            >
              <Radio size={18} strokeWidth={2.1} />
            </button>
          </div>

          <div className="flex-1 min-w-0 bg-white rounded-md border border-gray-200 min-h-[40px] flex items-center px-2 py-1.5 box-border">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              disabled={isTyping}
              style={{ minHeight: '24px' }}
              className="flex-1 min-w-0 text-[16px] text-gray-900 outline-none resize-none bg-transparent overflow-y-auto leading-snug disabled:bg-transparent"
              rows={1}
            />
            <button
              onClick={onToggleVoiceInput}
              disabled={isTyping || (isVoiceBusy && !isVoiceRecording)}
              className={`ml-1 p-1 w-[30px] h-[30px] sm:w-[32px] sm:h-[32px] flex items-center justify-center active:opacity-50 shrink-0 ${
                isVoiceRecording ? 'text-[#E5484D]' : 'text-gray-600'
              } ${isTyping || (isVoiceBusy && !isVoiceRecording) ? 'opacity-50' : ''}`}
              type="button"
            >
              <Mic size={24} strokeWidth={1.8} />
            </button>
          </div>

          <button className="text-gray-700 active:opacity-50 p-1 mb-0.5 shrink-0 w-[30px] sm:w-[32px] flex items-center justify-center">
            <Smile size={26} strokeWidth={1.5} />
          </button>

          <div className="shrink-0 mb-0.5 w-[50px] sm:w-[56px] flex justify-end">
            <AnimatePresence mode="wait">
              {inputValue.trim() || hasVoiceDraft ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={onSend}
                  disabled={isTyping}
                  className={`text-white text-[14px] sm:text-[15px] font-medium w-full h-[36px] sm:h-[38px] rounded-md ${
                    isTyping ? 'bg-[#7CD799]' : 'bg-[#07C160] active:opacity-80'
                  }`}
                >
                  发送
                </motion.button>
              ) : (
                <motion.button
                  key="plus"
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-gray-700 active:opacity-50 p-1 w-[30px] sm:w-[32px] flex items-center justify-center"
                >
                  <Plus size={28} strokeWidth={1.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {quotingMessage && (
          <div className="flex gap-2 mt-2 w-full">
            <div className="w-[42px] sm:w-[52px] shrink-0 pointer-events-none opacity-0" />
            <div className="flex-1 bg-[#EAEAEA] rounded-[4px] px-2 py-1.5 flex items-center justify-between overflow-hidden">
              <span className="text-[13px] text-gray-500 truncate flex-1">
                {quotingMessage.senderName}: {quotingMessage.content}
              </span>
              <button
                onClick={() => setQuotingMessage(null)}
                className="ml-2 text-gray-400 active:opacity-50 shrink-0"
              >
                <XCircle size={16} className="text-gray-400 fill-gray-200" />
              </button>
            </div>
            <div className="w-[30px] sm:w-[32px] shrink-0 pointer-events-none opacity-0" />
            <div className="w-[50px] sm:w-[56px] shrink-0 pointer-events-none opacity-0" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPlusMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#F7F7F7] border-t border-gray-200 overflow-hidden shrink-0"
          >
            <div className="grid grid-cols-4 gap-y-6 gap-x-4 p-6 pb-8">
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => {
                    setShowPlusMenu(false);
                    onShowCallOptions();
                  }}
                  className="w-[60px] h-[60px] bg-white rounded-2xl flex items-center justify-center text-gray-700 active:bg-gray-100 cursor-pointer shadow-sm"
                >
                  <Video size={28} strokeWidth={1.5} />
                </div>
                <span className="text-[12px] text-gray-500">视频通话</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => {
                    setShowPlusMenu(false);
                    onShowTransfer();
                  }}
                  className="w-[60px] h-[60px] bg-white rounded-2xl flex items-center justify-center text-gray-700 active:bg-gray-100 cursor-pointer shadow-sm"
                >
                  <ArrowRightLeft size={28} strokeWidth={1.5} />
                </div>
                <span className="text-[12px] text-gray-500">转账</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => {
                    setShowPlusMenu(false);
                    onChooseImage();
                  }}
                  className="w-[60px] h-[60px] bg-white rounded-2xl flex items-center justify-center text-gray-700 active:bg-gray-100 cursor-pointer shadow-sm"
                >
                  <ImageIcon size={28} strokeWidth={1.5} />
                </div>
                <span className="text-[12px] text-gray-500">图片</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => {
                    setShowPlusMenu(false);
                    onTakePhoto();
                  }}
                  className="w-[60px] h-[60px] bg-white rounded-2xl flex items-center justify-center text-gray-700 active:bg-gray-100 cursor-pointer shadow-sm"
                >
                  <Camera size={28} strokeWidth={1.5} />
                </div>
                <span className="text-[12px] text-gray-500">拍照</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


