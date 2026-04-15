import type { DreamPlaylist, DreamTrack, NeteaseImportResult } from '../types';

type PlaylistProvider = 'netease' | 'qq';

interface ResolveShareResponse {
  playlistId?: string | number;
}

interface NeteasePlaylistResponse {
  playlist?: {
    id?: string | number;
    name?: string;
    coverUrl?: string;
    picUrl?: string;
  };
  tracks?: unknown[];
}

interface NeteaseTrackRaw {
  id?: string | number;
  title?: string;
  name?: string;
  artist?: string;
  artists?: Array<{ name?: string } | string>;
  album?: string | { name?: string; picUrl?: string };
  coverUrl?: string;
  picUrl?: string;
  durationMs?: number;
  dt?: number;
  playUrl?: string;
  url?: string;
}

interface MetingTrackRaw {
  id?: string | number;
  name?: string;
  title?: string;
  artist?: string;
  author?: string;
  album?: string;
  url?: string;
  pic?: string;
  cover?: string;
  lrc?: string;
  duration?: number;
}

const METING_PLAYLIST_ENDPOINTS: Record<PlaylistProvider, string[]> = {
  netease: [
    'https://metingapi.nanorocky.top/?server=netease&type=playlist&id=',
    'https://metingapi.mo-app.cn/?server=netease&type=playlist&id=',
  ],
  qq: [
    'https://metingapi.nanorocky.top/?server=tencent&type=playlist&id=',
    'https://metingapi.mo-app.cn/?server=tencent&type=playlist&id=',
  ],
};

const FETCH_TIMEOUT_MS = 15000;

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const trimString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeProviderFromText = (text: string): PlaylistProvider | null => {
  const lower = text.toLowerCase();
  if (lower.includes('music.163.com') || lower.includes('网易云')) return 'netease';
  if (
    lower.includes('y.qq.com') ||
    lower.includes('qqmusic') ||
    lower.includes('qq音乐') ||
    lower.includes('i.y.qq.com')
  ) {
    return 'qq';
  }
  return null;
};

const getApiBase = (): string => {
  const raw = (import.meta.env.VITE_DREAM_MUSIC_API_BASE as string | undefined)?.trim() ?? '';
  if (!raw) return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
};

const toApiUrl = (path: string): string => {
  const base = getApiBase();
  if (!base) return path;
  return `${base}${path}`;
};

const createTrack = (input: {
  provider: PlaylistProvider;
  externalTrackId: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  lyricUrl?: string;
  durationMs?: number;
  playUrl?: string;
}): DreamTrack => {
  const now = Date.now();
  const playableUrl = trimString(input.playUrl);
  const normalizedDuration =
    typeof input.durationMs === 'number' && Number.isFinite(input.durationMs) && input.durationMs > 0
      ? Math.round(input.durationMs)
      : undefined;
  const normalizedExternalTrackId =
    input.provider === 'netease' ? input.externalTrackId : `${input.provider}:${input.externalTrackId}`;

  return {
    id: `${input.provider}-track-${input.externalTrackId}`,
    externalTrackId: normalizedExternalTrackId,
    title: input.title,
    artist: input.artist,
    album: input.album,
    coverUrl: input.coverUrl,
    lyricUrl: trimString(input.lyricUrl) || undefined,
    durationMs: normalizedDuration,
    playUrl: playableUrl || undefined,
    sourceType: input.provider,
    playableStatus: playableUrl ? 'ready' : 'unavailable',
    createdAt: now,
    updatedAt: now,
  };
};

const createPlaylist = (input: {
  provider: PlaylistProvider;
  playlistId: string;
  trackIds: string[];
  name: string;
  coverUrl?: string;
}): DreamPlaylist => {
  const now = Date.now();
  const normalizedExternalPlaylistId =
    input.provider === 'netease' ? input.playlistId : `${input.provider}:${input.playlistId}`;
  return {
    id: `${input.provider}-playlist-${input.playlistId}`,
    externalPlaylistId: normalizedExternalPlaylistId,
    sourceType: input.provider,
    name: input.name,
    coverUrl: input.coverUrl,
    trackIds: input.trackIds,
    createdAt: now,
    updatedAt: now,
  };
};

const extractUrlsFromText = (input: string): string[] => {
  const matches = input.match(/https?:\/\/[^\s]+/gi) ?? [];
  return matches
    .map((item) => item.replace(/[),.;!'"】\]}]+$/g, '').trim())
    .filter(Boolean);
};

const extractPlaylistIdByProvider = (
  input: string,
  provider: PlaylistProvider
): string | null => {
  const decoded = safeDecode(input);
  const patterns =
    provider === 'netease'
      ? [
          /playlist\?[^#\s]*?id=(\d{4,})/i,
          /#\/playlist\?id=(\d{4,})/i,
          /music\.163\.com\/playlist\/(\d{4,})/i,
          /[?&]id=(\d{4,})(?:[&#]|$)/i,
        ]
      : [
          /[?&](?:disstid|id|tid|songlistid)=(\d{3,})(?:[&#]|$)/i,
          /\/playlist\/(\d{3,})(?:[/?#]|$)/i,
          /\/playsquare\/(\d{3,})(?:[/?#]|$)/i,
          /\/taoge(?:\.html)?\?[^#\s]*?(?:id|disstid)=(\d{3,})/i,
        ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
};

const extractPlaylistNameFromShareText = (input: string): string | undefined => {
  const text = safeDecode(input).replace(/\s+/g, ' ').trim();
  if (!text) return undefined;

  const fromPrefix = text.match(/[:：]\s*(.+?)(?:https?:\/\/|$)/)?.[1]?.trim();
  if (fromPrefix) return fromPrefix;

  return undefined;
};

const extractTrackIdFromValue = (value: string): string | null => {
  const text = safeDecode(value).trim();
  if (!text) return null;

  const match = text.match(/[?&]id=([A-Za-z0-9]+)(?:[&#]|$)/i);
  if (match?.[1]) return match[1];

  const fallback = text.match(/\/([A-Za-z0-9]{6,})(?:\D|$)/);
  if (fallback?.[1]) return fallback[1];

  return null;
};

const fetchJsonWithTimeout = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    globalThis.clearTimeout(timer);
  }
};

const tryResolveNeteasePlaylistIdFromGateway = async (shareText: string): Promise<string | null> => {
  try {
    const payload = await fetchJsonWithTimeout<ResolveShareResponse>(toApiUrl('/api/music/netease/resolve-share'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shareUrl: shareText }),
    });
    const playlistId = payload.playlistId != null ? String(payload.playlistId).trim() : '';
    return playlistId || null;
  } catch {
    return null;
  }
};

const resolveSharedPlaylistTarget = async (
  shareText: string
): Promise<{ provider: PlaylistProvider; playlistId: string }> => {
  const normalized = safeDecode(shareText.trim());
  const urls = extractUrlsFromText(normalized);
  const providerHint = normalizeProviderFromText(normalized) ?? normalizeProviderFromText(urls.join(' ')) ?? 'netease';
  const candidates = [normalized, ...urls];

  const providerFirstId = candidates
    .map((item) => extractPlaylistIdByProvider(item, providerHint))
    .find((item): item is string => Boolean(item));
  if (providerFirstId) {
    return { provider: providerHint, playlistId: providerFirstId };
  }

  const crossProviderChecks: PlaylistProvider[] = providerHint === 'netease' ? ['qq'] : ['netease'];
  for (const provider of crossProviderChecks) {
    const hit = candidates
      .map((item) => extractPlaylistIdByProvider(item, provider))
      .find((item): item is string => Boolean(item));
    if (hit) {
      return { provider, playlistId: hit };
    }
  }

  if (providerHint === 'netease') {
    const resolvedByGateway = await tryResolveNeteasePlaylistIdFromGateway(normalized);
    if (resolvedByGateway) {
      return { provider: 'netease', playlistId: resolvedByGateway };
    }
  }

  throw new Error('未识别到歌单 ID，请粘贴完整分享文本或链接。');
};

const normalizeArtist = (raw: NeteaseTrackRaw): string => {
  const direct = trimString(raw.artist);
  if (direct) return direct;

  if (Array.isArray(raw.artists)) {
    const names = raw.artists
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        return trimString(item?.name);
      })
      .filter(Boolean);
    if (names.length > 0) return names.join(' / ');
  }

  return 'Unknown Artist';
};

const normalizeAlbum = (raw: NeteaseTrackRaw): string | undefined => {
  if (typeof raw.album === 'string') {
    const value = raw.album.trim();
    return value || undefined;
  }
  if (raw.album && typeof raw.album === 'object') {
    const value = trimString(raw.album.name);
    return value || undefined;
  }
  return undefined;
};

const normalizeCoverUrl = (raw: NeteaseTrackRaw): string | undefined => {
  const direct = trimString(raw.coverUrl);
  if (direct) return direct;
  const pic = trimString(raw.picUrl);
  if (pic) return pic;
  if (raw.album && typeof raw.album === 'object') {
    const albumPic = trimString(raw.album.picUrl);
    if (albumPic) return albumPic;
  }
  return undefined;
};

const normalizeDuration = (raw: NeteaseTrackRaw): number | undefined => {
  const value = Number(raw.durationMs ?? raw.dt);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value);
};

const normalizePlayUrl = (raw: NeteaseTrackRaw): string | undefined => {
  const direct = trimString(raw.playUrl);
  if (direct) return direct;
  const fallback = trimString(raw.url);
  return fallback || undefined;
};

const mapGatewayTrack = (rawTrack: unknown, index: number): DreamTrack | null => {
  if (!rawTrack || typeof rawTrack !== 'object') return null;
  const raw = rawTrack as NeteaseTrackRaw;
  const externalTrackId = raw.id != null ? String(raw.id).trim() : '';
  if (!externalTrackId) return null;

  const titleCandidate = trimString(raw.title) || trimString(raw.name);
  const title = titleCandidate || `Netease Track ${index + 1}`;

  return createTrack({
    provider: 'netease',
    externalTrackId,
    title,
    artist: normalizeArtist(raw),
    album: normalizeAlbum(raw),
    coverUrl: normalizeCoverUrl(raw),
    lyricUrl: `https://metingapi.nanorocky.top/?server=netease&type=lrc&id=${encodeURIComponent(externalTrackId)}&dwrc=true`,
    durationMs: normalizeDuration(raw),
    playUrl: normalizePlayUrl(raw),
  });
};

const mapGatewayResult = (
  playlistId: string,
  payload: NeteasePlaylistResponse,
  fallbackName?: string
): NeteaseImportResult => {
  const tracks = (payload.tracks ?? [])
    .map((item, index) => mapGatewayTrack(item, index))
    .filter((item): item is DreamTrack => item !== null);

  const playlistName = trimString(payload.playlist?.name) || fallbackName || `网易云歌单 ${playlistId}`;
  const coverUrl =
    trimString(payload.playlist?.coverUrl) ||
    trimString(payload.playlist?.picUrl) ||
    tracks.find((item) => item.coverUrl)?.coverUrl;

  return {
    playlist: createPlaylist({
      provider: 'netease',
      playlistId,
      trackIds: tracks.map((item) => item.id),
      name: playlistName,
      coverUrl,
    }),
    tracks,
  };
};

const mapMetingTrack = (
  provider: PlaylistProvider,
  playlistId: string,
  rawTrack: unknown,
  index: number
): DreamTrack | null => {
  if (!rawTrack || typeof rawTrack !== 'object') return null;
  const raw = rawTrack as MetingTrackRaw;

  const title =
    trimString(raw.name) ||
    trimString(raw.title) ||
    `${provider === 'netease' ? '网易云' : 'QQ音乐'} 歌曲 ${index + 1}`;
  const artist = trimString(raw.artist) || trimString(raw.author) || '未知歌手';
  const playUrl = trimString(raw.url);
  const trackIdFromRaw = raw.id != null ? String(raw.id).trim() : '';
  const trackIdFromUrl = raw.url ? extractTrackIdFromValue(raw.url) : null;
  const trackIdFromLrc = raw.lrc ? extractTrackIdFromValue(raw.lrc) : null;
  const externalTrackId = trackIdFromRaw || trackIdFromUrl || trackIdFromLrc || `${playlistId}-${index + 1}`;

  return createTrack({
    provider,
    externalTrackId,
    title,
    artist,
    album: trimString(raw.album) || undefined,
    coverUrl: trimString(raw.cover) || trimString(raw.pic) || undefined,
    lyricUrl: trimString(raw.lrc) || undefined,
    durationMs:
      typeof raw.duration === 'number' && Number.isFinite(raw.duration) && raw.duration > 0
        ? Math.round(raw.duration)
        : undefined,
    playUrl: playUrl || undefined,
  });
};

const mapMetingResult = (
  provider: PlaylistProvider,
  playlistId: string,
  payload: unknown,
  fallbackName?: string
): NeteaseImportResult | null => {
  if (!Array.isArray(payload)) return null;

  const tracks = payload
    .map((item, index) => mapMetingTrack(provider, playlistId, item, index))
    .filter((item): item is DreamTrack => item !== null);

  if (tracks.length === 0) return null;

  const playlistName =
    fallbackName || `${provider === 'netease' ? '网易云' : 'QQ音乐'}歌单 ${playlistId}`;
  const coverUrl = tracks.find((item) => item.coverUrl)?.coverUrl;

  return {
    playlist: createPlaylist({
      provider,
      playlistId,
      trackIds: tracks.map((item) => item.id),
      name: playlistName,
      coverUrl,
    }),
    tracks,
  };
};

const tryFetchNeteaseFromGateway = async (
  playlistId: string,
  fallbackName?: string
): Promise<NeteaseImportResult | null> => {
  try {
    const payload = await fetchJsonWithTimeout<NeteasePlaylistResponse>(
      toApiUrl(`/api/music/netease/playlists/${encodeURIComponent(playlistId)}`)
    );
    const mapped = mapGatewayResult(playlistId, payload, fallbackName);
    return mapped.tracks.length > 0 ? mapped : null;
  } catch {
    return null;
  }
};

const tryFetchFromMetingApis = async (
  provider: PlaylistProvider,
  playlistId: string,
  fallbackName?: string
): Promise<NeteaseImportResult | null> => {
  const endpoints = METING_PLAYLIST_ENDPOINTS[provider] ?? [];
  for (const endpoint of endpoints) {
    try {
      const payload = await fetchJsonWithTimeout<unknown>(`${endpoint}${encodeURIComponent(playlistId)}`);
      const mapped = mapMetingResult(provider, playlistId, payload, fallbackName);
      if (mapped?.tracks.length) return mapped;
    } catch {
      // ignore and continue fallback
    }
  }
  return null;
};

export const importNeteasePlaylistFromShareUrl = async (
  shareUrl: string
): Promise<NeteaseImportResult> => {
  const normalizedShareUrl = shareUrl.trim();
  if (!normalizedShareUrl) {
    throw new Error('请先粘贴网易云或 QQ 音乐歌单分享内容。');
  }

  const { provider, playlistId } = await resolveSharedPlaylistTarget(normalizedShareUrl);
  const playlistName = extractPlaylistNameFromShareText(normalizedShareUrl);

  if (provider === 'netease') {
    const gatewayResult = await tryFetchNeteaseFromGateway(playlistId, playlistName);
    if (gatewayResult?.tracks.length) return gatewayResult;
  }

  const metingResult = await tryFetchFromMetingApis(provider, playlistId, playlistName);
  if (metingResult?.tracks.length) return metingResult;

  throw new Error('歌单解析失败：未获取到可播放歌曲，请稍后重试。');
};
