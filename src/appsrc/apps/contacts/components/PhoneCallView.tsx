import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import type { Contact } from '../types';
import { getAvatarColor, getInitial } from '../utils';

interface PhoneCallViewProps {
  show: boolean;
  contact: Contact | null;
  status: 'dialing' | 'active';
  elapsedSeconds: number;
  micEnabled: boolean;
  speakerEnabled: boolean;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onHangup: () => void;
}

const formatCallDuration = (totalSeconds: number): string => {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const PhoneCallView: React.FC<PhoneCallViewProps> = ({
  show,
  contact,
  status,
  elapsedSeconds,
  micEnabled,
  speakerEnabled,
  onToggleMic,
  onToggleSpeaker,
  onHangup,
}) => {
  if (!contact) return null;

  const statusText = status === 'active' ? `通话中 ${formatCallDuration(elapsedSeconds)}` : '正在呼叫...';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-[220] overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(67,56,202,0.24),rgba(15,23,42,0.95)_62%)]" />
          <div
            className="absolute inset-0 opacity-25 blur-[24px] saturate-125"
            style={
              contact.avatar
                ? {
                    backgroundImage: `url(${contact.avatar})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.18),rgba(0,0,0,0.58))]" />

          <div className="relative z-10 flex h-full flex-col text-white">
            <div className="flex items-center px-5 pt-[max(env(safe-area-inset-top),28px)] text-white/90">
              <div className="text-[15px] font-medium tracking-[0.2px]">电话</div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 -mt-8">
              <div className="h-[118px] w-[118px] rounded-[26px] overflow-hidden border border-white/25 bg-white/14 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover" />
                ) : (
                  <span className={`${getAvatarColor(contact.name)} h-full w-full flex items-center justify-center text-[42px] font-semibold text-slate-800`}>
                    {getInitial(contact.name)}
                  </span>
                )}
              </div>

              <div className="mt-5 text-[34px] font-medium leading-none tracking-[0.4px]">
                {contact.name || '未知联系人'}
              </div>
              <div className="mt-2 text-[15px] text-white/72">{contact.phone || '--'}</div>
              <div className="mt-3 text-center text-[17px] leading-[1.35] text-white/75">{statusText}</div>
            </div>

            <div className="px-7 pb-[max(env(safe-area-inset-bottom),26px)]">
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
                  onClick={onHangup}
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
                <span className="w-[94px] text-center">挂断</span>
                <span className="w-[84px] text-center">{speakerEnabled ? '扬声器已开' : '扬声器已关'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
