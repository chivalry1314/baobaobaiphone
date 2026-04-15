import React from 'react';
import {
  Heart,
  MessageCircleMore,
  MoreVertical,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { PLAY_MODE_LABEL } from '../constants';
import type { DreamTrack, PlayMode } from '../types';
import { formatDuration, renderPlayModeIcon } from '../utils';

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
  onOpenLyrics: () => void;
  onOpenComment: () => void;
  onToggleFavorite: (trackId: string) => void;
  onSeek: (value: string) => void;
  onPlayPrev: () => void;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onCyclePlayMode: () => void;
  onVolumeChange: (value: number) => void;
  onPlayTrack: (trackId: string) => void;
}

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
  onOpenLyrics,
  onOpenComment,
  onToggleFavorite,
  onSeek,
  onPlayPrev,
  onTogglePlay,
  onPlayNext,
  onCyclePlayMode,
  onVolumeChange,
  onPlayTrack,
}) => (
  <section className="pt-2">
    <button
      type="button"
      onClick={onOpenLyrics}
      className="relative mx-auto mt-6 w-[80vw] max-w-[390px] aspect-square block"
      aria-label="打开歌词页"
    >
      <div className="pointer-events-none absolute -top-6 right-[4%] h-44 w-52 z-10">
        <div className="absolute left-1 top-1 h-7 w-7 rounded-full border border-[#D6CAB8] bg-[#F5F0E7] shadow-[0_0_0_8px_rgba(0,0,0,0.22)]" />
        <div className="absolute left-[16px] top-[19px] origin-left rotate-[42deg]">
          <div className="relative h-[6px] w-[196px] rounded-full bg-[#F5F0E7] shadow-[0_4px_8px_rgba(0,0,0,0.22)]">
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

    <style>{`@keyframes dream-record-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </section>
);
