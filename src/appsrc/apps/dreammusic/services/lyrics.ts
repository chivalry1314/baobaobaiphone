import type { DreamTrack } from '../types';

export interface TimedLyricLine {
  startMs: number;
  text: string;
}

const FETCH_TIMEOUT_MS = 12000;

const trimString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeFractionMs = (fraction?: string): number => {
  if (!fraction) return 0;
  if (fraction.length === 1) return Number(fraction) * 100;
  if (fraction.length === 2) return Number(fraction) * 10;
  return Number(fraction.slice(0, 3));
};

const toLrcTagMs = (minuteText: string, secondText: string, fractionText?: string): number => {
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (!Number.isFinite(minute) || !Number.isFinite(second)) return 0;
  return minute * 60 * 1000 + second * 1000 + normalizeFractionMs(fractionText);
};

const cleanDwrcWordTags = (text: string): string =>
  text
    .replace(/\(\d+,\d+,\d+\)/g, '')
    .replace(/\(\d+,\d+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const dedupeAndSortLines = (lines: TimedLyricLine[]): TimedLyricLine[] => {
  const sorted = [...lines].sort((left, right) => left.startMs - right.startMs);
  const next: TimedLyricLine[] = [];
  for (const item of sorted) {
    const prev = next[next.length - 1];
    if (prev && prev.startMs === item.startMs && prev.text === item.text) continue;
    next.push(item);
  }
  return next;
};

export const parseTimedLyricsText = (rawText: string): TimedLyricLine[] => {
  const normalized = trimString(rawText);
  if (!normalized) return [];

  const lines: TimedLyricLine[] = [];
  const rawLines = normalized.split(/\r?\n/);

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const dwrcMatch = line.match(/^\[(\d+),(\d+)\](.*)$/);
    if (dwrcMatch) {
      const startMs = Number(dwrcMatch[1]);
      const text = cleanDwrcWordTags(dwrcMatch[3] ?? '');
      if (Number.isFinite(startMs) && startMs >= 0 && text) {
        lines.push({ startMs, text });
      }
      continue;
    }

    const lrcTimeTagPattern = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
    const timestamps = [...line.matchAll(lrcTimeTagPattern)];
    if (timestamps.length === 0) continue;

    const text = cleanDwrcWordTags(line.replace(lrcTimeTagPattern, ''));
    if (!text) continue;

    for (const tag of timestamps) {
      const startMs = toLrcTagMs(tag[1], tag[2], tag[3]);
      if (Number.isFinite(startMs) && startMs >= 0) {
        lines.push({ startMs, text });
      }
    }
  }

  return dedupeAndSortLines(lines);
};

const extractTrackId = (track: DreamTrack): string | null => {
  const externalTrackId = trimString(track.externalTrackId);
  if (!externalTrackId) return null;
  const colonIndex = externalTrackId.indexOf(':');
  if (colonIndex < 0) return externalTrackId;
  return externalTrackId.slice(colonIndex + 1).trim() || null;
};

const resolveLyricUrl = (track: DreamTrack): string | null => {
  const direct = trimString(track.lyricUrl);
  if (direct) return direct;

  const trackId = extractTrackId(track);
  if (!trackId) return null;

  if (track.sourceType === 'netease') {
    return `https://metingapi.nanorocky.top/?server=netease&type=lrc&id=${encodeURIComponent(trackId)}&dwrc=true`;
  }

  if (track.sourceType === 'qq') {
    return `https://metingapi.nanorocky.top/?server=tencent&type=lrc&id=${encodeURIComponent(trackId)}&dwrc=true`;
  }

  return null;
};

const fetchTextWithTimeout = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Lyric request failed: ${response.status}`);
    }
    return await response.text();
  } finally {
    globalThis.clearTimeout(timer);
  }
};

export const fetchTimedLyrics = async (track: DreamTrack): Promise<TimedLyricLine[] | null> => {
  const lyricUrl = resolveLyricUrl(track);
  if (!lyricUrl) return null;

  const rawText = await fetchTextWithTimeout(lyricUrl);
  const parsed = parseTimedLyricsText(rawText);
  if (parsed.length === 0) return null;
  return parsed;
};
