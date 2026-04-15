import { useEffect, useMemo, useRef, useState } from 'react';
import type { DreamTrack } from '../types';
import { fetchTimedLyrics, parseTimedLyricsText, type TimedLyricLine } from '../services/lyrics';
import { buildFallbackLyrics } from '../utils';

interface UseTrackLyricsInput {
  currentTrack: DreamTrack | null;
  currentTimeSec: number;
  effectiveDurationSec: number;
}

const findActiveTimedLyricIndex = (lines: TimedLyricLine[], currentMs: number): number => {
  if (lines.length === 0) return -1;
  if (currentMs < lines[0].startMs) return -1;

  let left = 0;
  let right = lines.length - 1;
  let hit = 0;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const middleStartMs = lines[middle].startMs;
    if (middleStartMs <= currentMs) {
      hit = middle;
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return hit;
};

export const useTrackLyrics = ({
  currentTrack,
  currentTimeSec,
  effectiveDurationSec,
}: UseTrackLyricsInput) => {
  const [timedLyricLines, setTimedLyricLines] = useState<TimedLyricLine[] | null>(null);
  const [isLyricLoading, setIsLyricLoading] = useState(false);
  const lyricCacheRef = useRef<Map<string, TimedLyricLine[] | null>>(new Map());

  const trackLyricSignature = useMemo(() => {
    if (!currentTrack) return '';
    const inlineLyricKey = currentTrack.lyrics?.join('\n') ?? '';
    return [
      currentTrack.id,
      currentTrack.sourceType,
      currentTrack.externalTrackId,
      currentTrack.lyricUrl ?? '',
      inlineLyricKey,
    ].join('::');
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack) {
      setTimedLyricLines(null);
      setIsLyricLoading(false);
      return;
    }

    const cached = lyricCacheRef.current.get(trackLyricSignature);
    if (cached !== undefined) {
      setTimedLyricLines(cached);
      setIsLyricLoading(false);
      return;
    }

    let isCancelled = false;

    const resolveLyrics = async () => {
      setIsLyricLoading(true);
      try {
        const inlineText = currentTrack.lyrics?.join('\n') ?? '';
        const inlineTimedLines = parseTimedLyricsText(inlineText);
        if (inlineTimedLines.length > 0) {
          if (isCancelled) return;
          lyricCacheRef.current.set(trackLyricSignature, inlineTimedLines);
          setTimedLyricLines(inlineTimedLines);
          return;
        }

        const fetched = await fetchTimedLyrics(currentTrack);
        if (isCancelled) return;
        lyricCacheRef.current.set(trackLyricSignature, fetched);
        setTimedLyricLines(fetched);
      } catch {
        if (isCancelled) return;
        lyricCacheRef.current.set(trackLyricSignature, null);
        setTimedLyricLines(null);
      } finally {
        if (!isCancelled) setIsLyricLoading(false);
      }
    };

    void resolveLyrics();

    return () => {
      isCancelled = true;
    };
  }, [currentTrack, trackLyricSignature]);

  const fallbackLyricLines = useMemo(() => {
    if (currentTrack?.lyrics && currentTrack.lyrics.length > 0) {
      return currentTrack.lyrics;
    }
    return buildFallbackLyrics(currentTrack);
  }, [currentTrack]);

  const lyricLines = useMemo(
    () => (timedLyricLines && timedLyricLines.length > 0 ? timedLyricLines.map((item) => item.text) : fallbackLyricLines),
    [timedLyricLines, fallbackLyricLines]
  );

  const activeLyricIndex = useMemo(() => {
    if (timedLyricLines && timedLyricLines.length > 0) {
      const currentMs = Math.max(0, Math.floor(currentTimeSec * 1000));
      return findActiveTimedLyricIndex(timedLyricLines, currentMs);
    }

    if (lyricLines.length === 0 || effectiveDurationSec <= 0) return -1;
    const ratio = Math.max(0, Math.min(1, currentTimeSec / effectiveDurationSec));
    return Math.min(lyricLines.length - 1, Math.floor(ratio * lyricLines.length));
  }, [timedLyricLines, currentTimeSec, lyricLines.length, effectiveDurationSec]);

  return {
    lyricLines,
    activeLyricIndex,
    isLyricLoading,
    hasTimedLyrics: Boolean(timedLyricLines && timedLyricLines.length > 0),
  };
};
