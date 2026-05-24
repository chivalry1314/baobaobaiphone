import { dreamMusicMemoryController } from './memory';
import type { DreamComment, DreamPlayHistoryItem, DreamTrack } from './types';

const FAVORITE_MEMORY_SESSION_ID = 'dreammusic-favorite-track';
const COMMENT_MEMORY_SESSION_PREFIX = 'dreammusic-comment-track';
const RECENT_MEMORY_SESSION_ID = 'dreammusic-recent-summary';
const RECENT_MEMORY_SOURCE_ID = 'recent-summary:latest';
const LISTEN_TOGETHER_SESSION_ID = 'dreammusic-listen-together';
const DAY_MS = 24 * 60 * 60 * 1000;

interface RankedTrackItem {
  track: DreamTrack;
  count: number;
  lastPlayedAt: number;
}

const toTrackLine = (track: DreamTrack): string => `${track.title} - ${track.artist}`;

const toSourceLabel = (sourceType: DreamTrack['sourceType']): string => {
  switch (sourceType) {
    case 'netease':
      return '网易云';
    case 'qq':
      return 'QQ音乐';
    case 'free-online':
      return '在线免费音源';
    default:
      return sourceType;
  }
};

const buildFavoriteSourceId = (trackId: string): string => `favorite-track:${trackId}`;
const buildCommentSessionId = (trackId: string): string =>
  `${COMMENT_MEMORY_SESSION_PREFIX}:${trackId}`;
const buildCommentSourceId = (commentId: string): string => `comment:${commentId}`;
const buildListenTogetherSourceId = (companionId: string): string =>
  `listen-together:${companionId}`;

const formatListenTogetherDuration = (durationMs: number): string => {
  const totalMinutes = Math.max(0, Math.floor(durationMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}分钟`;
  return `${hours}小时${minutes}分钟`;
};

const rankTracksFromHistory = (params: {
  playHistory: DreamPlayHistoryItem[];
  trackById: Map<string, DreamTrack>;
  fromTimestamp: number;
}): RankedTrackItem[] => {
  const rankedByTrackId = new Map<string, RankedTrackItem>();

  params.playHistory.forEach((historyItem) => {
    if (historyItem.playedAt < params.fromTimestamp) return;

    const track = params.trackById.get(historyItem.trackId);
    if (!track) return;

    const existing = rankedByTrackId.get(track.id);
    if (!existing) {
      rankedByTrackId.set(track.id, {
        track,
        count: 1,
        lastPlayedAt: historyItem.playedAt,
      });
      return;
    }

    existing.count += 1;
    if (historyItem.playedAt > existing.lastPlayedAt) {
      existing.lastPlayedAt = historyItem.playedAt;
    }
  });

  return [...rankedByTrackId.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return right.lastPlayedAt - left.lastPlayedAt;
  });
};

const getDailyAndWeeklyRankedTracks = (params: {
  playHistory: DreamPlayHistoryItem[];
  trackById: Map<string, DreamTrack>;
  nowTimestamp: number;
}) => {
  const todayStart = new Date(params.nowTimestamp);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTs = todayStart.getTime();
  const recentWeekStartTs = params.nowTimestamp - 7 * DAY_MS;

  const dailyRanked = rankTracksFromHistory({
    playHistory: params.playHistory,
    trackById: params.trackById,
    fromTimestamp: todayStartTs,
  });
  const weeklyRanked = rankTracksFromHistory({
    playHistory: params.playHistory,
    trackById: params.trackById,
    fromTimestamp: recentWeekStartTs,
  });

  return {
    dailyTop: dailyRanked.slice(0, 3),
    weeklyTop: weeklyRanked.slice(0, 5),
  };
};

const appendRankedLines = (lines: string[], title: string, ranked: RankedTrackItem[]): void => {
  lines.push(title);
  if (ranked.length === 0) {
    lines.push('- 暂无足够数据');
    return;
  }

  ranked.forEach((item, index) => {
    lines.push(`${index + 1}. ${toTrackLine(item.track)}（播放${item.count}次）`);
  });
};

export const buildDreamMusicRecentSummarySignature = (params: {
  playHistory: DreamPlayHistoryItem[];
  trackById: Map<string, DreamTrack>;
  nowTimestamp?: number;
}): string => {
  const nowTimestamp = params.nowTimestamp ?? Date.now();
  const { dailyTop, weeklyTop } = getDailyAndWeeklyRankedTracks({
    playHistory: params.playHistory,
    trackById: params.trackById,
    nowTimestamp,
  });
  if (dailyTop.length === 0 && weeklyTop.length === 0) return '';

  const dailyKey = dailyTop.map((item) => `${item.track.id}:${item.count}`).join('|');
  const weeklyKey = weeklyTop.map((item) => `${item.track.id}:${item.count}`).join('|');
  return `d:${dailyKey}__w:${weeklyKey}`;
};

export const upsertDreamMusicFavoriteMemory = (params: {
  contactId: string;
  track: DreamTrack;
}): void => {
  const sourceId = buildFavoriteSourceId(params.track.id);
  dreamMusicMemoryController.removeBySessionSources(FAVORITE_MEMORY_SESSION_ID, [sourceId]);

  const lines = [
    `我收藏了歌曲：${toTrackLine(params.track)}`,
    `来源：${toSourceLabel(params.track.sourceType)}`,
  ];
  if (params.track.album?.trim()) {
    lines.push(`专辑：${params.track.album.trim()}`);
  }

  dreamMusicMemoryController.record({
    contactId: params.contactId,
    role: 'user',
    sourceType: 'favorite-track',
    sessionId: FAVORITE_MEMORY_SESSION_ID,
    sourceId,
    content: lines.join('\n'),
  });
};

export const removeDreamMusicFavoriteMemory = (trackId: string): void => {
  const normalizedTrackId = trackId.trim();
  if (!normalizedTrackId) return;
  const sourceId = buildFavoriteSourceId(normalizedTrackId);
  dreamMusicMemoryController.removeBySessionSources(FAVORITE_MEMORY_SESSION_ID, [sourceId]);
};

export const upsertDreamMusicCommentMemory = (comment: DreamComment): void => {
  const sessionId = buildCommentSessionId(comment.trackId);
  const sourceId = buildCommentSourceId(comment.id);
  dreamMusicMemoryController.removeBySessionSources(sessionId, [sourceId]);

  const lines = [
    `我对歌曲《${comment.trackTitle}》发表了评论`,
    `歌手：${comment.trackArtist}`,
    `内容：${comment.content}`,
  ];

  dreamMusicMemoryController.record({
    contactId: comment.authorRoleId,
    role: 'user',
    sourceType: 'comment-track',
    sessionId,
    sourceId,
    content: lines.join('\n'),
  });
};

export const removeDreamMusicCommentMemory = (comment: DreamComment): void => {
  const sessionId = buildCommentSessionId(comment.trackId);
  const sourceId = buildCommentSourceId(comment.id);
  dreamMusicMemoryController.removeBySessionSources(sessionId, [sourceId]);
};

export const upsertDreamMusicRecentSummaryMemory = (params: {
  contactId: string;
  playHistory: DreamPlayHistoryItem[];
  trackById: Map<string, DreamTrack>;
  nowTimestamp?: number;
}): void => {
  const nowTimestamp = params.nowTimestamp ?? Date.now();
  const { dailyTop, weeklyTop } = getDailyAndWeeklyRankedTracks({
    playHistory: params.playHistory,
    trackById: params.trackById,
    nowTimestamp,
  });

  if (dailyTop.length === 0 && weeklyTop.length === 0) {
    dreamMusicMemoryController.removeBySessionSources(RECENT_MEMORY_SESSION_ID, [
      RECENT_MEMORY_SOURCE_ID,
    ]);
    return;
  }

  dreamMusicMemoryController.removeBySessionSources(RECENT_MEMORY_SESSION_ID, [RECENT_MEMORY_SOURCE_ID]);

  const lines = ['最近听歌偏好摘要：'];
  appendRankedLines(lines, '今日高频：', dailyTop);
  appendRankedLines(lines, '近7天高频：', weeklyTop);

  dreamMusicMemoryController.record({
    contactId: params.contactId,
    role: 'user',
    sourceType: 'recent-play-summary',
    sessionId: RECENT_MEMORY_SESSION_ID,
    sourceId: RECENT_MEMORY_SOURCE_ID,
    content: lines.join('\n'),
  });
};

export const clearDreamMusicRecentSummaryMemory = (): void => {
  dreamMusicMemoryController.removeBySessionSources(RECENT_MEMORY_SESSION_ID, [RECENT_MEMORY_SOURCE_ID]);
};

export const upsertDreamMusicListenTogetherMemory = (params: {
  contactId: string;
  companionId: string;
  companionName: string;
  durationMs: number;
}): void => {
  const normalizedCompanionId = params.companionId.trim();
  if (!normalizedCompanionId) return;
  const sourceId = buildListenTogetherSourceId(normalizedCompanionId);
  dreamMusicMemoryController.removeBySessionSources(LISTEN_TOGETHER_SESSION_ID, [sourceId]);

  const durationText = formatListenTogetherDuration(params.durationMs);
  dreamMusicMemoryController.record({
    contactId: params.contactId,
    role: 'user',
    sourceType: 'listen-together-duration',
    sessionId: LISTEN_TOGETHER_SESSION_ID,
    sourceId,
    content: `我和${params.companionName || '对方'}一起听歌累计${durationText}。`,
  });
};
