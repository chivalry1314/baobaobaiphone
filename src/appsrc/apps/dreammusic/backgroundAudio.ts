let dreamMusicBackgroundAudio: HTMLAudioElement | null = null;

export const getDreamMusicBackgroundAudio = (): HTMLAudioElement | null => {
  if (typeof Audio === 'undefined') return null;
  if (!dreamMusicBackgroundAudio) {
    dreamMusicBackgroundAudio = new Audio();
    dreamMusicBackgroundAudio.preload = 'metadata';
  }
  return dreamMusicBackgroundAudio;
};

export const playDreamMusicAudioFromGesture = async (input: {
  trackId: string;
  playUrl: string;
  volume?: number;
  resetTime?: boolean;
}): Promise<void> => {
  const audio = getDreamMusicBackgroundAudio();
  if (!audio) return;
  const nextSrc = new URL(input.playUrl, window.location.href).href;
  const loadedTrackId = audio.dataset.dreamMusicTrackId ?? null;
  if (loadedTrackId !== input.trackId || (audio.src !== nextSrc && audio.currentSrc !== nextSrc)) {
    audio.dataset.dreamMusicTrackId = input.trackId;
    audio.src = input.playUrl;
    if (input.resetTime !== false) audio.currentTime = 0;
    audio.load();
  }
  if (typeof input.volume === 'number') {
    audio.volume = input.volume;
  }
  await audio.play();
};
