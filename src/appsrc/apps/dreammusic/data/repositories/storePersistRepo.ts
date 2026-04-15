import { createAppPersistOptions } from '../../../../../core/persistOptions';
import type { PersistOptions } from 'zustand/middleware';

type PersistHooks<TState, TPersistedState> = Pick<
  PersistOptions<TState, TPersistedState>,
  'partialize' | 'merge' | 'onRehydrateStorage'
>;

export const createDreamMusicPersistOptions = <TState, TPersistedState = TState>(
  hooks?: PersistHooks<TState, TPersistedState>
) =>
  createAppPersistOptions<TState, TPersistedState>({
    appId: 'dreammusic',
    ...(hooks ?? {}),
  });
