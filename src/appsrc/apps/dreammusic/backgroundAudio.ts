let dreamMusicBackgroundAudio: HTMLAudioElement | null = null;

export const getDreamMusicBackgroundAudio = (): HTMLAudioElement | null => {
  if (typeof Audio === 'undefined') return null;
  if (!dreamMusicBackgroundAudio) {
    dreamMusicBackgroundAudio = new Audio();
    dreamMusicBackgroundAudio.preload = 'metadata';
  }
  return dreamMusicBackgroundAudio;
};
