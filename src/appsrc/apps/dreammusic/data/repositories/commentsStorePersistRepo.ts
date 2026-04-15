import { createAppPersistOptions } from '../../../../../core/persistOptions';
import type { PersistOptions } from 'zustand/middleware';

const DREAM_MUSIC_COMMENTS_STORAGE_KEY = 'dreammusic-comments-storage';

type PersistHooks<TState, TPersistedState> = Pick<
  PersistOptions<TState, TPersistedState>,
  'partialize' | 'merge' | 'onRehydrateStorage'
>;

export const createDreamMusicCommentsPersistOptions = <TState, TPersistedState = TState>(
  hooks?: PersistHooks<TState, TPersistedState>
) =>
  createAppPersistOptions<TState, TPersistedState>({
    appId: 'dreammusic',
    storeName: 'comments',
    storageKey: DREAM_MUSIC_COMMENTS_STORAGE_KEY,
    ...(hooks ?? {}),
  });
