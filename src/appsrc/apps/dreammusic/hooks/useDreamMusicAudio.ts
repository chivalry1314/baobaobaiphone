import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { DreamTrack } from '../types';

interface UseDreamMusicAudioInput {
  audioRef: RefObject<HTMLAudioElement | null>;
  currentPlayableTrack: DreamTrack | null;
  currentTrackId: string | null;
  isPlaying: boolean;
  volume: number;
  playNext: () => void;
  setPlaying: (isPlaying: boolean) => void;
  setCurrentTimeSec: (seconds: number) => void;
  setDurationSec: (seconds: number) => void;
  markTrackPlayed: (trackId: string) => void;
  onPlaybackError?: () => void;
}

export const useDreamMusicAudio = ({
  audioRef,
  currentPlayableTrack,
  currentTrackId,
  isPlaying,
  volume,
  playNext,
  setPlaying,
  setCurrentTimeSec,
  setDurationSec,
  markTrackPlayed,
  onPlaybackError,
}: UseDreamMusicAudioInput) => {
  const loadedTrackIdRef = useRef<string | null>(null);
  const lastPlayedTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [audioRef, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentPlayableTrack?.playUrl) {
      loadedTrackIdRef.current = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setDurationSec(0);
      return;
    }

    if (loadedTrackIdRef.current !== currentPlayableTrack.id) {
      loadedTrackIdRef.current = currentPlayableTrack.id;
      audio.src = currentPlayableTrack.playUrl;
      audio.currentTime = 0;
      setCurrentTimeSec(0);
      setDurationSec(currentPlayableTrack.durationMs ? Math.floor(currentPlayableTrack.durationMs / 1000) : 0);
      audio.load();
    }

    if (isPlaying) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [audioRef, currentPlayableTrack, isPlaying, setCurrentTimeSec, setDurationSec, setPlaying]);

  useEffect(() => {
    const trackId = currentTrackId?.trim();
    if (!trackId) {
      lastPlayedTrackIdRef.current = null;
      return;
    }
    if (lastPlayedTrackIdRef.current === trackId) return;
    lastPlayedTrackIdRef.current = trackId;
    markTrackPlayed(trackId);
  }, [currentTrackId, markTrackPlayed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDurationSec(Math.floor(audio.duration));
      }
    };
    const onTime = () => setCurrentTimeSec(audio.currentTime || 0);
    const onEnded = () => playNext();
    const onError = () => {
      setPlaying(false);
      onPlaybackError?.();
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [audioRef, onPlaybackError, playNext, setCurrentTimeSec, setDurationSec, setPlaying]);
};
