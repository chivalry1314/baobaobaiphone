import { getGlobalSettingsSnapshot } from '@baobaobaiOS/sdk';
import { getContactsSnapshot } from '../../shared/business/contacts/snapshotBridge';
import { registerDailyScriptActionExecutor } from '../../shared/business/dailyscript/actionBridge';
import { parseContactRoleId } from '../../shared/business/roleIdentity';
import { useDreamMusicCommentsStore } from './commentsStore';
import { upsertDreamMusicCommentMemory } from './memoryHelpers';
import { fetchTimedLyrics } from './services/lyrics';
import { useDreamMusicStore } from './store';
import type { DreamComment, DreamTrack } from './types';
import { renderPaperMagicPrompt } from '../papermagic/promptCatalog';

interface DreamMusicCommentTrackScriptPayload {
  targetTrackId?: string;
  targetTrackTitle?: string;
}

const COMMENT_MAX_LENGTH = 120;
const CONTACT_FALLBACK_NAME = '通讯录角色';
const DEFAULT_CHAT_BASE_URL = 'https://api.openai.com/v1';

const toTrimmedText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const normalizeExcerpt = (value: string, max = 28): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}...`;
};

const limitCommentLength = (value: string, max = COMMENT_MAX_LENGTH): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}...`;
};

const normalizeSingleLineComment = (value: string): string => {
  const normalized = value
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return limitCommentLength(normalized);
};

const extractContentFromChatCompletion = (rawContent: unknown): string => {
  if (typeof rawContent === 'string') return rawContent.trim();
  if (!Array.isArray(rawContent)) return '';

  return rawContent
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const maybeText = (item as { text?: unknown }).text;
      return typeof maybeText === 'string' ? maybeText : '';
    })
    .join('\n')
    .trim();
};

const resolveContactAuthorName = (roleId: string): string => {
  const contactId = parseContactRoleId(roleId);
  if (!contactId) return CONTACT_FALLBACK_NAME;
  const contact = getContactsSnapshot().find((item) => item.id === contactId);
  return contact?.name?.trim() || contact?.id || CONTACT_FALLBACK_NAME;
};

type DreamMusicStoreSnapshot = ReturnType<typeof useDreamMusicStore.getState>;

const resolveTargetTrack = (
  input: DreamMusicCommentTrackScriptPayload,
  storeState: DreamMusicStoreSnapshot
): DreamTrack | null => {
  const trackById = new Map(storeState.tracks.map((item) => [item.id, item]));
  if (trackById.size === 0) return null;

  const explicitTrackId = toTrimmedText(input.targetTrackId);
  if (explicitTrackId) {
    const explicit = trackById.get(explicitTrackId);
    if (explicit) return explicit;
  }

  const explicitTrackTitle = toTrimmedText(input.targetTrackTitle);
  if (explicitTrackTitle) {
    const exactTitle = storeState.tracks.find((item) => item.title.trim() === explicitTrackTitle);
    if (exactTitle) return exactTitle;

    const partialTitle = storeState.tracks.find((item) => item.title.includes(explicitTrackTitle));
    if (partialTitle) return partialTitle;
  }

  const candidateTrackIds = [
    storeState.currentTrackId || '',
    ...storeState.favoriteTrackIds,
    ...storeState.recentlyPlayedTrackIds,
    ...storeState.queueTrackIds,
  ];
  const dedupedCandidateIds = [...new Set(candidateTrackIds.map((item) => item.trim()).filter(Boolean))];
  for (const candidateId of dedupedCandidateIds) {
    const matched = trackById.get(candidateId);
    if (matched) return matched;
  }

  const readyTracks = storeState.tracks
    .filter((item) => item.playableStatus === 'ready')
    .sort((left, right) => right.updatedAt - left.updatedAt);
  if (readyTracks.length > 0) return readyTracks[0];

  const tracksByLatest = [...storeState.tracks].sort((left, right) => right.updatedAt - left.updatedAt);
  return tracksByLatest[0] || null;
};

const resolveTrackLyricLines = async (track: DreamTrack): Promise<string[]> => {
  try {
    const timed = await fetchTimedLyrics(track);
    if (timed && timed.length > 0) {
      return timed.map((item) => item.text.trim()).filter(Boolean);
    }
  } catch {
    // Ignore lyric request failures and fallback to inline lyrics.
  }

  if (Array.isArray(track.lyrics) && track.lyrics.length > 0) {
    return track.lyrics.map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const pickLyricCue = (lyricLines: string[]): string => {
  const meaningful = lyricLines.find((item) => item.length >= 6);
  return normalizeExcerpt(meaningful || lyricLines[0] || '', 24);
};

const pickCommentCues = (comments: DreamComment[], authorRoleId: string): string[] => {
  const preferred = comments
    .filter((item) => item.authorRoleId !== authorRoleId)
    .map((item) => normalizeExcerpt(item.content, 24))
    .filter(Boolean);
  if (preferred.length > 0) return preferred.slice(0, 3);

  return comments
    .map((item) => normalizeExcerpt(item.content, 24))
    .filter(Boolean)
    .slice(0, 3);
};

const buildTemplateComment = (params: {
  trackTitle: string;
  lyricCue: string;
  commentCues: string[];
}): string => {
  const songTitle = normalizeExcerpt(params.trackTitle, 30) || '这首歌';
  const lyricCue = params.lyricCue;
  const [firstCommentCue, secondCommentCue] = params.commentCues;

  if (lyricCue && firstCommentCue && secondCommentCue) {
    return limitCommentLength(
      `《${songTitle}》里“${lyricCue}”这句很戳我，评论区提到“${firstCommentCue}”“${secondCommentCue}”，共鸣感很强。`
    );
  }

  if (lyricCue && firstCommentCue) {
    return limitCommentLength(
      `《${songTitle}》里“${lyricCue}”这句很有画面感，也和评论区说的“${firstCommentCue}”互相呼应。`
    );
  }

  if (lyricCue) {
    return limitCommentLength(`《${songTitle}》里“${lyricCue}”这句真的很打动人，越听越有感觉。`);
  }

  if (firstCommentCue && secondCommentCue) {
    return limitCommentLength(
      `《${songTitle}》的评论区很有氛围，特别是“${firstCommentCue}”“${secondCommentCue}”这两句，很有共鸣。`
    );
  }

  if (firstCommentCue) {
    return limitCommentLength(
      `看《${songTitle}》评论区提到“${firstCommentCue}”，会想起自己第一次听这首歌的感觉。`
    );
  }

  return limitCommentLength(`《${songTitle}》这首歌很耐听，旋律和情绪都很到位。`);
};

const requestAiGeneratedComment = async (params: {
  track: DreamTrack;
  lyricLines: string[];
  lyricCue: string;
  commentCues: string[];
  authorName: string;
}): Promise<string | null> => {
  const settings = getGlobalSettingsSnapshot();
  const apiKey = toTrimmedText(settings.apiKey);
  const baseUrl = stripTrailingSlash(toTrimmedText(settings.baseUrl) || DEFAULT_CHAT_BASE_URL);
  const model = toTrimmedText(settings.model);

  if (!apiKey || !baseUrl || !model) return null;

  const lyricContext = params.lyricLines.slice(0, 12).join('\n');
  const commentContext = params.commentCues.slice(0, 6).join('\n');

  const commentPrompt = renderPaperMagicPrompt('dreammusic.commentTrack', {
    maxLength: COMMENT_MAX_LENGTH,
    trackTitle: params.track.title,
    trackArtist: params.track.artist,
    authorName: params.authorName,
    lyricContext: lyricContext || '(无可用歌词)',
    commentContext: commentContext || '(无可用评论线索)',
    lyricCueLine: params.lyricCue ? ` 可重点参考这句：${params.lyricCue}` : '',
  });
  const systemPrompt = commentPrompt.system || '';
  const userPrompt = commentPrompt.user || '';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: Math.min(0.85, Math.max(0.2, settings.temperature ?? 0.55)),
      max_tokens: Math.min(220, Math.max(80, settings.maxTokens || 140)),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  }).catch(() => null);

  if (!response || !response.ok) return null;

  const data = await response.json().catch(() => null);
  const rawContent = extractContentFromChatCompletion(
    (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)?.choices?.[0]?.message
      ?.content
  );
  const normalized = normalizeSingleLineComment(rawContent);
  return normalized || null;
};

let dreamMusicDailyScriptActionRegistered = false;

export const registerDreamMusicDailyScriptAction = (): void => {
  if (dreamMusicDailyScriptActionRegistered) return;
  dreamMusicDailyScriptActionRegistered = true;

  registerDailyScriptActionExecutor('dreammusic.commentTrack', async ({ roleId, payload }) => {
    const contactId = parseContactRoleId(roleId);
    if (!contactId) {
      return {
        ok: false,
        message: '梦音乐评论动作仅支持通讯录角色执行',
      };
    }

    const input =
      payload && typeof payload === 'object' ? (payload as DreamMusicCommentTrackScriptPayload) : {};

    const storeState = useDreamMusicStore.getState();
    const track = resolveTargetTrack(input, storeState);
    if (!track) {
      return {
        ok: false,
        message: '暂无可评论歌曲，请先在梦音乐中添加或播放歌曲',
      };
    }

    const lyricLines = await resolveTrackLyricLines(track);
    const lyricCue = pickLyricCue(lyricLines);
    const trackComments = useDreamMusicCommentsStore
      .getState()
      .comments.filter((item) => item.trackId === track.id);
    const commentCues = pickCommentCues(trackComments, roleId);
    const authorName = resolveContactAuthorName(roleId);

    const fallbackComment = buildTemplateComment({
      trackTitle: track.title,
      lyricCue,
      commentCues,
    });

    const aiComment = await requestAiGeneratedComment({
      track,
      lyricLines,
      lyricCue,
      commentCues,
      authorName,
    });

    const content = aiComment || fallbackComment;
    const createdComment = useDreamMusicCommentsStore.getState().addComment({
      trackId: track.id,
      trackTitle: track.title,
      trackArtist: track.artist,
      trackCoverUrl: track.coverUrl,
      authorRoleId: roleId,
      authorName,
      content,
    });
    if (!createdComment) {
      throw new Error('梦音乐自动评论写入失败');
    }

    upsertDreamMusicCommentMemory(createdComment);
    const trackLogLabel = `${track.title}${track.artist ? ` - ${track.artist}` : ''}`.trim();
    return {
      ok: true,
      message: `已在《${trackLogLabel || track.id}》下发布评论`,
    };
  });
};
