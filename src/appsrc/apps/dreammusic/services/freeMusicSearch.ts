export interface FreeMusicSearchItem {
  source: 'itunes' | 'meting-netease';
  sourceTrackId: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  lrcUrl?: string;
  durationMs?: number;
  playUrl: string;
}

interface MetingSearchResultRaw {
  id?: string | number;
  name?: string;
  title?: string;
  artist?: string;
  author?: string;
  album?: string;
  pic?: string;
  cover?: string;
  lrc?: string;
  duration?: number;
  url?: string;
}

interface ItunesSearchResultRaw {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  previewUrl?: string;
}

interface ItunesSearchResponseRaw {
  resultCount?: number;
  results?: ItunesSearchResultRaw[];
}

const METING_SEARCH_ENDPOINTS = [
  'https://metingapi.nanorocky.top/?server=netease&type=search&id=0&dwrc=true&keyword=',
  'https://metingapi.mo-app.cn/?server=netease&type=search&id=0&keyword=',
];

const FETCH_TIMEOUT_MS = 12000;

const trimString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const extractIdFromValue = (value: string): string | null => {
  const text = value.trim();
  if (!text) return null;

  const fromQuery = text.match(/[?&]id=(\d{4,})(?:[&#]|$)/i);
  if (fromQuery?.[1]) return fromQuery[1];

  const fromPath = text.match(/\/(\d{4,})(?:\D|$)/);
  if (fromPath?.[1]) return fromPath[1];

  return null;
};

const fetchJsonWithTimeout = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    globalThis.clearTimeout(timer);
  }
};

const normalizeMetingItem = (raw: MetingSearchResultRaw): FreeMusicSearchItem | null => {
  if (!raw || typeof raw !== 'object') return null;

  const playUrl = trimString(raw.url);
  const title = trimString(raw.name) || trimString(raw.title);
  const artist = trimString(raw.artist) || trimString(raw.author);
  const idFromRaw = raw.id != null ? String(raw.id).trim() : '';
  const sourceTrackId = idFromRaw || (playUrl ? extractIdFromValue(playUrl) : null) || '';

  if (!sourceTrackId || !title || !artist || !playUrl) return null;

  const durationMs =
    typeof raw.duration === 'number' && Number.isFinite(raw.duration) && raw.duration > 0
      ? Math.round(raw.duration)
      : undefined;

  return {
    source: 'meting-netease',
    sourceTrackId,
    title,
    artist,
    album: trimString(raw.album) || undefined,
    coverUrl: trimString(raw.cover) || trimString(raw.pic) || undefined,
    lrcUrl: trimString(raw.lrc) || undefined,
    durationMs,
    playUrl,
  };
};

const normalizeItunesItem = (raw: ItunesSearchResultRaw): FreeMusicSearchItem | null => {
  if (!raw || typeof raw !== 'object') return null;
  const sourceTrackId = typeof raw.trackId === 'number' ? String(raw.trackId) : '';
  const title = typeof raw.trackName === 'string' ? raw.trackName.trim() : '';
  const artist = typeof raw.artistName === 'string' ? raw.artistName.trim() : '';
  const playUrl = typeof raw.previewUrl === 'string' ? raw.previewUrl.trim() : '';

  if (!sourceTrackId || !title || !artist || !playUrl) return null;

  return {
    source: 'itunes',
    sourceTrackId,
    title,
    artist,
    album: typeof raw.collectionName === 'string' ? raw.collectionName.trim() || undefined : undefined,
    coverUrl: typeof raw.artworkUrl100 === 'string' ? raw.artworkUrl100.trim() || undefined : undefined,
    durationMs:
      typeof raw.trackTimeMillis === 'number' && raw.trackTimeMillis > 0
        ? Math.round(raw.trackTimeMillis)
        : undefined,
    playUrl,
  };
};

const searchViaMeting = async (keyword: string, limit: number): Promise<FreeMusicSearchItem[]> => {
  for (const endpoint of METING_SEARCH_ENDPOINTS) {
    try {
      const url = `${endpoint}${encodeURIComponent(keyword)}&limit=${limit}`;
      const payload = await fetchJsonWithTimeout<unknown>(url);
      if (!Array.isArray(payload)) continue;

      const items = payload
        .map((item) => normalizeMetingItem(item as MetingSearchResultRaw))
        .filter((item): item is FreeMusicSearchItem => item !== null);

      if (items.length > 0) return items;
    } catch {
      // ignore and continue fallback
    }
  }
  return [];
};

const searchViaItunes = async (keyword: string, limit: number): Promise<FreeMusicSearchItem[]> => {
  const query = new URLSearchParams({
    term: keyword,
    media: 'music',
    entity: 'song',
    limit: String(limit),
  });

  const response = await fetch(`https://itunes.apple.com/search?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Online music search failed.');
  }

  const payload = (await response.json()) as ItunesSearchResponseRaw;
  const rawList = Array.isArray(payload.results) ? payload.results : [];
  return rawList
    .map(normalizeItunesItem)
    .filter((item): item is FreeMusicSearchItem => item !== null);
};

export const searchFreeMusicByKeyword = async (
  keyword: string,
  limit = 24
): Promise<FreeMusicSearchItem[]> => {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return [];

  const normalizedLimit = Math.max(1, Math.min(50, Math.floor(limit)));

  const metingResults = await searchViaMeting(normalizedKeyword, normalizedLimit);
  if (metingResults.length > 0) return metingResults;

  return searchViaItunes(normalizedKeyword, normalizedLimit);
};
