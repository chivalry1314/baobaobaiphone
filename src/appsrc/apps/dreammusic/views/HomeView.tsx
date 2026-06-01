import React from 'react';
import {
  Heart,
  MessageCircleMore,
  MoreVertical,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  UserPlus,
  X,
} from 'lucide-react';
import { PLAY_MODE_LABEL } from '../constants';
import type { DreamListenTogetherState, DreamTrack, PlayMode } from '../types';
import { formatDuration, renderPlayModeIcon } from '../utils';

interface ListenTogetherContactOption {
  id: string;
  name: string;
  avatar?: string;
}

interface HomeViewProps {
  currentTrack: DreamTrack | null;
  isPlaying: boolean;
  currentTrackId: string | null;
  favoriteTrackSet: Set<string>;
  effectiveDurationSec: number;
  currentTimeSec: number;
  playMode: PlayMode;
  volume: number;
  playableTracks: DreamTrack[];
  playableTrackIds: string[];
  uiMessage: string | null;
  listenTogether: DreamListenTogetherState | null;
  listenTogetherDurationsByCompanionId: Record<string, number>;
  selfName: string;
  selfAvatar?: string;
  inviteContacts: ListenTogetherContactOption[];
  isInviteSheetOpen: boolean;
  onOpenLyrics: () => void;
  onOpenComment: () => void;
  onOpenInviteSheet: () => void;
  onCloseInviteSheet: () => void;
  onInviteContact: (contactId: string) => void;
  onClearListenTogether: () => void;
  onToggleFavorite: (trackId: string) => void;
  onSeek: (value: string) => void;
  onPlayPrev: () => void;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onCyclePlayMode: () => void;
  onVolumeChange: (value: number) => void;
  onPlayTrack: (trackId: string) => void;
}

const formatListenTogetherElapsed = (totalMs: number): string => {
  const totalMinutes = Math.max(0, Math.floor(totalMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}分钟`;
  return `${hours}小时${minutes}分钟`;
};

export const HomeView: React.FC<HomeViewProps> = ({
  currentTrack,
  isPlaying,
  currentTrackId,
  favoriteTrackSet,
  effectiveDurationSec,
  currentTimeSec,
  playMode,
  volume,
  playableTracks,
  playableTrackIds,
  uiMessage,
  listenTogether,
  listenTogetherDurationsByCompanionId,
  selfName,
  selfAvatar,
  inviteContacts,
  isInviteSheetOpen,
  onOpenLyrics,
  onOpenComment,
  onOpenInviteSheet,
  onCloseInviteSheet,
  onInviteContact,
  onClearListenTogether,
  onToggleFavorite,
  onSeek,
  onPlayPrev,
  onTogglePlay,
  onPlayNext,
  onCyclePlayMode,
  onVolumeChange,
  onPlayTrack,
}) => {
  const isTogetherActive = listenTogether?.status === 'active';
  const isTogetherPending = listenTogether?.status === 'pending';
  const [listenNow, setListenNow] = React.useState(() => Date.now());
  const listenStartedAt = listenTogether?.acceptedAt || listenTogether?.invitedAt || listenNow;
  const settledListenMs = listenTogether?.companionId
    ? Math.max(0, listenTogetherDurationsByCompanionId[listenTogether.companionId] || 0)
    : 0;
  const activeListenMs = isTogetherActive ? Math.max(0, listenNow - listenStartedAt) : 0;
  const listenTogetherText = isTogetherActive
    ? `音乐传递心声，一起听歌${formatListenTogetherElapsed(settledListenMs + activeListenMs)}`
    : isTogetherPending
      ? '音乐传递心声，等待对方一起听'
      : '';

  React.useEffect(() => {
    if (!listenTogether) return undefined;
    setListenNow(Date.now());
    const timer = window.setInterval(() => setListenNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [listenTogether?.status, listenTogether?.acceptedAt, listenTogether?.invitedAt]);

  return (
  <section className="relative pt-2">
    {listenTogether ? (
      <div className="mx-auto mb-8 mt-2 flex max-w-[330px] flex-col items-center text-center">
        <div className="relative h-[78px] w-[214px]">
          <button
            type="button"
            onClick={onClearListenTogether}
            className="absolute right-[-8px] top-[-10px] z-20 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/12 text-[#EADFCC]/70"
            aria-label="结束一起听"
          >
            <X size={14} />
          </button>
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 214 78"
            aria-hidden="true"
          >
            <path
              d="M31 33 C20 37 20 49 26 56"
              fill="none"
              stroke="rgba(235,220,205,0.5)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M26 56 C28 69 37 82 49 92"
              fill="none"
              stroke="rgba(235,220,205,0.5)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M183 33 C194 37 194 49 188 56"
              fill="none"
              stroke="rgba(235,220,205,0.5)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M188 56 C186 69 177 82 165 92"
              fill="none"
              stroke="rgba(235,220,205,0.5)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute left-[43px] top-0 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-[#F7EFE7] bg-[#F6EFE6] text-[#7A5840] shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
            {selfAvatar ? (
              <img src={selfAvatar} alt={selfName || '我'} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="absolute right-[43px] top-0 grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-[#F7EFE7] bg-[#F6EFE6] text-[#7A5840] shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
            {listenTogether.companionAvatar ? (
              <img src={listenTogether.companionAvatar} alt={listenTogether.companionName} className="h-full w-full object-cover" />
            ) : null}
          </div>
        </div>
        <div className="flex max-w-full items-center justify-center gap-2 text-[12px] font-semibold text-[#EADFCC]/72">
          <span className="min-w-0 truncate">
            {listenTogetherText}
          </span>
        </div>
      </div>
    ) : null}

    <button
      type="button"
      onClick={onOpenLyrics}
      className={`relative mx-auto ${listenTogether ? 'mt-0' : 'mt-10'} w-[74vw] max-w-[360px] aspect-square block`}
      aria-label="打开歌词页"
    >
      <div className="pointer-events-none absolute -top-10 right-[-3%] h-36 w-44 z-10">
        <div className="absolute left-1 top-1 h-7 w-7 rounded-full border border-[#D6CAB8] bg-[#F5F0E7] shadow-[0_0_0_8px_rgba(0,0,0,0.22)]" />
        <div className="absolute left-[16px] top-[19px] origin-left rotate-[42deg]">
            <div className="relative h-[6px] w-[166px] rounded-full bg-[#F5F0E7] shadow-[0_4px_8px_rgba(0,0,0,0.22)]">
            <div className="absolute right-[44px] top-1/2 h-[10px] w-[10px] -translate-y-1/2 rounded-full bg-[#F5F0E7] shadow-[0_2px_5px_rgba(0,0,0,0.2)]" />
            <div className="absolute right-0 top-1/2 h-[18px] w-[28px] -translate-y-1/2 rounded-[7px] border border-black/10 bg-[#F8F3EA] shadow-[0_3px_8px_rgba(0,0,0,0.22)]" />
            <div className="absolute right-[9px] top-1/2 h-[4px] w-[10px] -translate-y-1/2 rounded-full bg-[#D5C7B3]" />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 rounded-full border border-black/30 bg-[radial-gradient(circle_at_50%_45%,#1B1A19_0%,#0E0E0E_62%,#060606_100%)] shadow-[0_28px_60px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-[28px] rounded-full border border-white/10 overflow-hidden">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              animation: 'dream-record-spin 18s linear infinite',
              animationPlayState: isPlaying ? 'running' : 'paused',
            }}
          >
            {currentTrack?.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="absolute inset-[14%] h-[72%] w-[72%] rounded-full object-cover border border-black/45"
              />
            ) : (
              <div className="absolute inset-[14%] rounded-full border border-white/15 bg-[radial-gradient(circle_at_30%_25%,#D8A26B,#854D30_50%,#3D261A_100%)]" />
            )}
          </div>
          <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EADFD1] border border-[#B39D85]" />
        </div>
      </div>
    </button>

    <div className="mt-9 px-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[28px] leading-tight font-semibold truncate">{currentTrack?.title || '梦音乐'}</p>
          <p className="mt-1 text-[14px] text-[#E4D9C9]/80 truncate">
            {currentTrack
              ? `${currentTrack.artist}${currentTrack.album ? ` · ${currentTrack.album}` : ''}`
              : '黑胶暖调播放器'}
          </p>
        </div>
        <div className="flex items-center gap-4 pt-1 text-[#E9DDCC]">
          <button
            type="button"
            onClick={() => {
              if (currentTrack) onToggleFavorite(currentTrack.id);
            }}
            aria-label="收藏歌曲"
          >
            <Heart
              size={23}
              fill={currentTrack && favoriteTrackSet.has(currentTrack.id) ? 'currentColor' : 'none'}
            />
          </button>
          <button type="button" onClick={onOpenComment} className="opacity-75" aria-label="进入评论页">
            <MessageCircleMore size={23} />
          </button>
          <button
            type="button"
            onClick={onOpenInviteSheet}
            className={isTogetherPending || isTogetherActive ? 'text-[#FFD9B0]' : 'opacity-75'}
            aria-label="邀请一起听"
          >
            <UserPlus size={23} />
          </button>
          <button type="button" className="opacity-75" aria-label="更多功能">
            <MoreVertical size={23} />
          </button>
        </div>
      </div>

      <div className="mt-6">
        <input
          type="range"
          min={0}
          max={Math.max(1, effectiveDurationSec)}
          value={Math.min(currentTimeSec, Math.max(1, effectiveDurationSec))}
          onChange={(event) => onSeek(event.target.value)}
          className="w-full accent-[#F0E7DA]"
        />
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#E4D9C9]/80">
          <span>{formatDuration(currentTimeSec, 'sec')}</span>
          <span className="tracking-[0.2em]">极高音质</span>
          <span>{formatDuration(effectiveDurationSec, 'sec')}</span>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-center gap-10">
        <button
          type="button"
          onClick={onPlayPrev}
          disabled={playableTrackIds.length === 0}
          className="opacity-85 disabled:opacity-40"
        >
          <SkipBack size={34} />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={playableTrackIds.length === 0}
          className="h-20 w-20 rounded-[26px] bg-[#F0E8DB]/95 text-[#5D452E] inline-flex items-center justify-center shadow-[0_12px_20px_rgba(0,0,0,0.25)] disabled:opacity-50"
        >
          {isPlaying ? <Pause size={34} /> : <Play size={34} className="ml-1" />}
        </button>
        <button
          type="button"
          onClick={onPlayNext}
          disabled={playableTrackIds.length === 0}
          className="opacity-85 disabled:opacity-40"
        >
          <SkipForward size={34} />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between text-[12px] text-[#E4D9C9]/80">
        <button
          type="button"
          onClick={onCyclePlayMode}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/15 px-2.5 py-1"
        >
          {renderPlayModeIcon(playMode)}
          {PLAY_MODE_LABEL[playMode]}
        </button>
        <div className="inline-flex items-center gap-2 min-w-[118px]">
          <span>音量</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            className="flex-1 accent-[#F0E8DB]"
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[11px] text-[#E4D9C9]/65 mb-2">可播放歌曲</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {playableTracks.length === 0 && (
            <div className="text-[12px] text-[#E4D9C9]/70">当前没有可播放歌曲</div>
          )}
          {playableTracks.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => onPlayTrack(track.id)}
              className={`rounded-xl border px-3 py-2 min-w-[138px] text-left ${currentTrackId === track.id ? 'border-[#EEDFC7]/60 bg-[#8B6C4A]/45' : 'border-white/10 bg-black/15'}`}
            >
              <p className="text-[12px] text-[#F7F2EA] truncate">{track.title}</p>
              <p className="text-[10px] text-[#E4D9C9]/70 truncate">{track.artist}</p>
            </button>
          ))}
        </div>
      </div>

      {uiMessage && (
        <p className="mt-3 text-[11px] text-amber-100/85 rounded-lg bg-black/15 border border-white/10 px-2.5 py-1.5">
          {uiMessage}
        </p>
      )}
    </div>

    {isInviteSheetOpen ? (
      <div className="absolute inset-x-0 top-[265px] z-30 mx-auto w-[min(94vw,360px)] overflow-hidden rounded-[22px] bg-white text-[#272A33] shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
        <div className="mx-auto mt-2 h-1.5 w-8 rounded-full bg-[#E5E7EB]" />
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <div className="text-[12px] font-semibold leading-none">邀请一起听歌</div>
          <button
            type="button"
            onClick={onCloseInviteSheet}
            className="grid h-7 w-7 place-items-center rounded-full bg-[#F3F4F6] text-[#8A8F99]"
            aria-label="关闭"
          >
            <X size={15} />
          </button>
        </div>
        <div className="overflow-x-auto px-5 pb-3.5">
          {inviteContacts.length === 0 ? (
            <div className="rounded-[16px] bg-[#F6F7F9] px-3 py-4 text-center text-[12px] text-[#8A8F99]">
              暂无可邀请的微信联系人
            </div>
          ) : (
            <div className="flex items-start gap-7">
              {inviteContacts.slice(0, 4).map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => onInviteContact(contact.id)}
                  className="w-[62px] shrink-0 text-center active:opacity-70"
                >
                  <div className="mx-auto grid h-[48px] w-[48px] place-items-center overflow-hidden rounded-full border border-[#E3E5EA] bg-[#F9E7E9] text-[15px] font-semibold text-[#C98A92]">
                    {contact.avatar ? (
                      <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="relative h-full w-full">
                        <span className="absolute left-1/2 top-[15px] h-[13px] w-[13px] -translate-x-1/2 rounded-full bg-[#F4C7CD]" />
                        <span className="absolute bottom-[3px] left-1/2 h-[18px] w-[34px] -translate-x-1/2 rounded-t-full bg-[#F4C7CD]" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 truncate text-[12px] leading-tight text-[#343741]">{contact.name}</div>
                </button>
              ))}
              <button
                type="button"
                className="w-[62px] shrink-0 text-center active:opacity-70"
                aria-label="更多联系人"
              >
                <div className="mx-auto grid h-[48px] w-[48px] place-items-center rounded-full bg-[#F6F7F9] text-[22px] font-semibold tracking-[4px] text-[#30323A]">
                  ...
                </div>
                <div className="mt-2 truncate text-[12px] leading-tight text-[#343741]">更多</div>
              </button>
            </div>
          )}
        </div>
      </div>
    ) : null}

    <style>{`@keyframes dream-record-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </section>
  );
};
