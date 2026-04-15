import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Copy,
  Forward,
  Star,
  Trash2,
  CheckSquare,
  MessageSquareQuote,
  Type,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  Volume2,
  VolumeX,
  Minimize2,
  X,
  Check,
} from 'lucide-react';
import { Avatar } from './WeChatChatMessageItem';

const MenuItem = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className="flex h-[56px] w-[52px] cursor-pointer flex-col items-center justify-center rounded-md transition-colors active:bg-[#383838]"
  >
    <Icon size={20} className="mb-1.5 text-white" strokeWidth={1.5} />
    <span className="text-[11px] text-gray-200">{label}</span>
  </div>
);

export const Modals = {
  TransferView: ({ show, onClose, onSubmit, amount, setAmount, character }: any) => (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[120] flex flex-col bg-[#EDEDED]"
        >
          <div className="flex shrink-0 items-center justify-between bg-[#EDEDED] px-4 pb-3 pt-12">
            <button onClick={onClose} className="px-1 text-gray-900 active:opacity-50">
              <X size={26} strokeWidth={1.5} />
            </button>
            <div className="flex-1" />
          </div>
          <div className="flex flex-1 flex-col items-center p-4 pt-8">
            <Avatar url={character.avatar} />
            <span className="mt-2 text-[16px] text-gray-900">微信转账给 {character.name}</span>
            <span className="mt-1 text-[14px] text-gray-500">微信号 {character.id}</span>
            <div className="mt-8 w-full rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-[15px] text-gray-900">转账金额</h2>
              <div className="mb-8 flex items-end border-b border-gray-200 pb-2">
                <span className="mr-2 text-[36px] font-semibold leading-none text-gray-900">¥</span>
                <input
                  type="number"
                  className="h-[50px] w-full flex-1 bg-transparent text-[44px] font-semibold leading-none text-gray-900 outline-none"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  autoFocus
                />
              </div>
              <button
                onClick={onSubmit}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full rounded bg-[#07C160] py-3 text-[17px] font-medium text-white transition-colors active:bg-[#06ad56] disabled:bg-[#A9E8C3]"
              >
                转账
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  ),

  FullScreenEditor: ({
    show,
    onClose,
    onSend,
    inputValue,
    setInputValue,
    isTyping,
    adjustHeight,
    textareaRef,
  }: any) => (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[120] flex flex-col bg-[#F7F7F7]"
        >
          <div className="flex items-center justify-between border-b border-gray-200 bg-[#F7F7F7] px-4 pb-3 pt-12">
            <button onClick={onClose} className="px-1 text-[16px] text-gray-900 active:opacity-50">
              取消
            </button>
            <div className="text-[17px] font-medium text-gray-900">编辑文字</div>
            <button
              onClick={onSend}
              disabled={!inputValue.trim() || isTyping}
              className={`rounded-[4px] px-4 py-1.5 text-[15px] font-medium transition-colors ${
                !inputValue.trim() || isTyping
                  ? 'bg-gray-200 text-gray-400'
                  : 'bg-[#07C160] text-white active:bg-[#06ad56]'
              }`}
            >
              发送
            </button>
          </div>
          <div className="flex-1 bg-white p-4">
            <textarea
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
                adjustHeight(textareaRef.current);
              }}
              autoFocus
              className="h-full w-full resize-none bg-transparent text-[17px] leading-relaxed text-gray-900 outline-none"
              placeholder="请输入消息..."
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  ),

  ContextMenu: ({
    menuState,
    closeMenu,
    onCopy,
    onForward,
    onDelete,
    onSelect,
    onQuote,
    onTranscribe,
    transcribeLabel,
  }: any) => (
    <AnimatePresence>
      {menuState && (
        <div className="fixed inset-0 z-[100]" onClick={closeMenu}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute flex max-w-[280px] flex-wrap justify-center gap-x-1 gap-y-1 rounded-lg bg-[#4C4C4C] px-2 py-1 shadow-xl"
            style={{ left: menuState.x, top: menuState.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <MenuItem icon={Copy} label="复制" onClick={onCopy} />
            <MenuItem icon={Forward} label="转发" onClick={onForward} />
            <MenuItem icon={Star} label="收藏" onClick={closeMenu} />
            {typeof onTranscribe === 'function' ? (
              <MenuItem icon={Type} label={transcribeLabel || '转文字'} onClick={onTranscribe} />
            ) : null}
            <MenuItem icon={Trash2} label="删除" onClick={onDelete} />
            <MenuItem icon={CheckSquare} label="多选" onClick={onSelect} />
            <MenuItem icon={MessageSquareQuote} label="引用" onClick={onQuote} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  ),

  ForwardTargetModal: ({ show, onClose, characters, onSelectContact }: any) => (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[120] flex flex-col bg-white"
        >
          <div className="flex shrink-0 items-center border-b border-gray-200 bg-[#F7F7F7] px-4 pb-2.5 pt-12">
            <button onClick={onClose} className="flex items-center text-gray-900 active:opacity-50">
              <X size={28} strokeWidth={1.5} />
            </button>
            <h1 className="flex-1 pr-7 text-center text-[17px] font-medium text-gray-900">选择一个聊天</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            {characters.map((char: any) => (
              <div
                key={char.id}
                onClick={() => onSelectContact(char.id)}
                className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 active:bg-gray-50"
              >
                <Avatar url={char.avatar} />
                <span className="text-[17px] text-gray-900">{char.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  ),

  ConfirmDialog: ({ show, onClose, onConfirm }: any) => (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex w-[280px] flex-col overflow-hidden rounded-[10px] bg-white"
          >
            <div className="border-b border-gray-100 py-6 text-center text-[16px] font-medium text-gray-900">
              确认删除？
            </div>
            <div className="flex items-center">
              <button
                onClick={onClose}
                className="flex-1 border-r border-gray-100 py-3.5 text-[16px] text-gray-900 active:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3.5 text-[16px] font-medium text-[#E64340] active:bg-gray-100"
              >
                删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  ),

  Toast: ({ message }: { message: string | null }) => (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-[120px] left-1/2 z-[200] flex items-center gap-2 whitespace-nowrap rounded-[8px] bg-black/70 px-5 py-2.5 text-[15px] text-white shadow-md"
        >
          <Check size={18} strokeWidth={2.5} />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  ),

  VoiceRecorderModal: ({ show, onClose, isRecording, onToggleRecording }: any) => (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/35 p-3" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[76vh] min-h-[420px] w-full max-w-[400px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[#F6F6F6] shadow-[0_18px_50px_rgba(0,0,0,0.25)]"
          >
            <div className="flex h-[62px] shrink-0 items-center justify-end border-b border-gray-200 px-4">
              <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-500 active:opacity-60">
                <X size={24} strokeWidth={2.1} />
              </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10">
              {isRecording ? (
                <div className="mb-4 flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-medium text-emerald-600">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  录音中
                </div>
              ) : null}
              <motion.button
                type="button"
                onClick={onToggleRecording}
                animate={isRecording ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={
                  isRecording
                    ? { duration: 1.1, repeat: Infinity, repeatType: 'loop' }
                    : { duration: 0.2 }
                }
                className={`relative flex h-[172px] w-[172px] items-center justify-center rounded-full text-white transition-colors active:scale-95 ${
                  isRecording
                    ? 'bg-[#10B981] shadow-[0_20px_38px_rgba(16,185,129,0.34)]'
                    : 'bg-[#12B877] shadow-[0_18px_34px_rgba(16,185,129,0.26)]'
                }`}
              >
                <Mic size={52} strokeWidth={2.2} />
                {isRecording ? (
                  <>
                    <motion.span
                      className="pointer-events-none absolute -inset-2 rounded-full border-2 border-emerald-400/45"
                      animate={{ scale: [1, 1.16, 1.28], opacity: [0.5, 0.25, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <motion.span
                      className="pointer-events-none absolute -inset-2 rounded-full border-2 border-emerald-300/35"
                      animate={{ scale: [1, 1.16, 1.28], opacity: [0.45, 0.22, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.9 }}
                    />
                  </>
                ) : null}
              </motion.button>
              {isRecording ? (
                <div className="mt-5 flex h-8 items-end gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                    <motion.span
                      key={idx}
                      className="w-1.5 rounded-full bg-emerald-500/85"
                      animate={{ height: [8, 24, 12, 28, 10] }}
                      transition={{
                        duration: 1.15,
                        repeat: Infinity,
                        repeatType: 'loop',
                        ease: 'easeInOut',
                        delay: idx * 0.08,
                      }}
                    />
                  ))}
                </div>
              ) : null}
              <p className="mt-9 text-center text-[17px] font-medium leading-[1.4] text-[#8E959E]">
                {isRecording ? '点击图标结束录音' : '点击图标开始录音'}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  ),

  CallTypeSheet: ({ show, onClose, onVideoCall, onVoiceCall }: any) => (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[140] flex items-end bg-black/35" onClick={onClose}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full rounded-t-[16px] bg-[#ECECEC] pb-safe"
          >
            <button
              type="button"
              onClick={onVideoCall}
              className="flex h-[62px] w-full items-center justify-center gap-2.5 border-b border-gray-200 bg-white text-[17px] font-medium text-gray-900 active:bg-gray-100"
            >
              <Video size={22} strokeWidth={1.9} />
              <span>视频通话</span>
            </button>
            <button
              type="button"
              onClick={onVoiceCall}
              className="flex h-[62px] w-full items-center justify-center gap-2.5 border-b border-gray-200 bg-white text-[17px] font-medium text-gray-900 active:bg-gray-100"
            >
              <Phone size={22} strokeWidth={1.9} />
              <span>语音通话</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 h-[62px] w-full bg-white text-[17px] text-gray-900 active:bg-gray-100"
            >
              取消
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  ),

  VoiceCallView: ({
    show,
    onClose,
    onMinimize,
    character,
    statusText,
    micEnabled,
    speakerEnabled,
    onToggleMic,
    onToggleSpeaker,
  }: any) => (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[260] overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(177,148,83,0.2),rgba(17,19,22,0.94)_62%)]" />
          <div
            className="absolute inset-0 opacity-25 blur-[22px] saturate-125"
            style={
              character?.avatar
                ? {
                    backgroundImage: `url(${character.avatar})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.18),rgba(0,0,0,0.52))]" />

          <div className="relative z-10 flex h-full flex-col text-white">
            <button
              type="button"
              onClick={() => {
                if (typeof onMinimize === 'function') {
                  onMinimize();
                  return;
                }
                if (typeof onClose === 'function') {
                  onClose();
                }
              }}
              className="absolute right-3 top-[max(env(safe-area-inset-top),18px)] z-20 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/28 active:opacity-75"
              style={{ touchAction: 'manipulation' }}
              aria-label="缩略语音通话"
            >
              <Minimize2 size={20} />
            </button>

            <div className="flex items-center px-5 pt-[max(env(safe-area-inset-top),38px)] text-white/92">
              <div className="text-[15px] font-medium tracking-[0.2px]">语音通话</div>
            </div>

            <div className="-mt-8 flex flex-1 flex-col items-center justify-center px-6">
              <div className="h-[118px] w-[118px] overflow-hidden rounded-[24px] border border-white/25 bg-white/14 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                {character?.avatar ? (
                  <img src={character.avatar} alt={character.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="mt-5 text-[34px] font-medium leading-none tracking-[0.4px]">
                {character?.name || '对方'}
              </div>
              <div className="mt-3 text-center text-[17px] leading-[1.35] text-white/75">{statusText}</div>
            </div>

            <div className="px-7 pb-[max(env(safe-area-inset-bottom),24px)]">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={onToggleMic}
                  className={`flex h-[84px] w-[84px] items-center justify-center rounded-full text-black transition-colors ${
                    micEnabled ? 'bg-white shadow-[0_12px_24px_rgba(0,0,0,0.2)]' : 'bg-white/30 text-black/70'
                  } active:opacity-80`}
                >
                  {micEnabled ? <Mic size={36} strokeWidth={2.1} /> : <MicOff size={36} strokeWidth={2.1} />}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-[94px] w-[94px] items-center justify-center rounded-full bg-[#E84A4A] text-white shadow-[0_14px_28px_rgba(232,74,74,0.34)] active:opacity-85"
                >
                  <PhoneOff size={38} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={onToggleSpeaker}
                  className={`flex h-[84px] w-[84px] items-center justify-center rounded-full text-white transition-colors ${
                    speakerEnabled
                      ? 'border border-white/25 bg-white/24'
                      : 'border border-white/10 bg-black/48'
                  } active:opacity-80`}
                >
                  {speakerEnabled ? <Volume2 size={36} strokeWidth={2.1} /> : <VolumeX size={36} strokeWidth={2.1} />}
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-[14px] font-medium text-white/85">
                <span className="w-[84px] text-center">{micEnabled ? '麦克风已开' : '麦克风已关'}</span>
                <span className="w-[94px] text-center">取消</span>
                <span className="w-[84px] text-center">{speakerEnabled ? '扬声器已开' : '扬声器已关'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  ),
};
