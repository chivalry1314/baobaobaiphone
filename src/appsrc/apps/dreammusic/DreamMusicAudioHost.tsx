import React, { useMemo, useRef, useState } from 'react';
import { getDreamMusicBackgroundAudio } from './backgroundAudio';
import { useDreamMusicAudio } from './hooks';
import { useDreamMusicStore } from './store';
import { isReadyTrack } from './utils';

export const DreamMusicAudioHost: React.FC = () => {
  const {
    tracks,
    currentTrackId,
    isPlaying,
    volume,
    playNext,
    setPlaying,
    setCurrentTimeSec,
    markTrackPlayed,
  } = useDreamMusicStore();
  const [durationSec, setDurationSec] = useState(0);
  const backgroundAudio = useMemo(() => getDreamMusicBackgroundAudio(), []);
  const audioRef = useRef<HTMLAudioElement | null>(backgroundAudio);
  audioRef.current = backgroundAudio;
  const currentPlayableTrack = useMemo(() => {
    const currentTrack = currentTrackId
      ? tracks.find((track) => track.id === currentTrackId) ?? null
      : null;
    return currentTrack && isReadyTrack(currentTrack) ? currentTrack : null;
  }, [currentTrackId, tracks]);

  useDreamMusicAudio({
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
  });

  void durationSec;
  return null;
};

export default DreamMusicAudioHost;
