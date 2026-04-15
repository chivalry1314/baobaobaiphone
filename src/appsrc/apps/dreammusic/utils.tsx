import React from 'react';
import { Repeat, Repeat1, Shuffle } from 'lucide-react';
import type { DreamTrack } from './types';

export const formatDuration = (
  durationMsOrSec?: number,
  source: 'ms' | 'sec' = 'ms'
): string => {
  if (!durationMsOrSec || !Number.isFinite(durationMsOrSec) || durationMsOrSec <= 0) {
    return '--:--';
  }

  const totalSec = source === 'ms'
    ? Math.floor(durationMsOrSec / 1000)
    : Math.floor(durationMsOrSec);
  const min = Math.floor(Math.max(0, totalSec) / 60);
  const sec = Math.max(0, totalSec) % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const isReadyTrack = (track: DreamTrack): boolean =>
  track.playableStatus === 'ready' && typeof track.playUrl === 'string' && track.playUrl.trim().length > 0;

export const renderPlayModeIcon = (mode: 'sequence' | 'shuffle' | 'single_loop') => {
  if (mode === 'shuffle') return <Shuffle size={15} />;
  if (mode === 'single_loop') return <Repeat1 size={15} />;
  return <Repeat size={15} />;
};

export const buildFallbackLyrics = (track: DreamTrack | null): string[] => {
  if (!track) return ['还没有正在播放的歌曲', '去首页播放一首歌吧'];
  return [
    `《${track.title}》`,
    `演唱：${track.artist}`,
    track.album ? `专辑：${track.album}` : '来自梦音乐',
    ' ',
    '旋律落进夜色',
    '唱针轻轻划过记忆',
    '把喜欢的人和歌一起收藏',
    '在下一次播放时重逢',
  ];
};

interface ToOnlineTrackInput {
  source: string;
  sourceTrackId: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  lrcUrl?: string;
  durationMs?: number;
  playUrl: string;
}

export const toOnlineTrack = (input: ToOnlineTrackInput): DreamTrack => {
  const externalTrackId = `${input.source}-${input.sourceTrackId}`;
  const now = Date.now();
  return {
    id: `free-online-${externalTrackId}`,
    title: input.title,
    artist: input.artist,
    album: input.album,
    coverUrl: input.coverUrl,
    lyricUrl: input.lrcUrl,
    durationMs: input.durationMs,
    sourceType: 'free-online',
    playableStatus: input.playUrl ? 'ready' : 'unavailable',
    externalTrackId,
    playUrl: input.playUrl,
    createdAt: now,
    updatedAt: now,
  };
};
