import type { LoveSpaceStore } from '../../types';
import type { LoveSpaceActionOptions } from './types';

export const createLoveSpaceRoleSlice = ({
  set,
  ensureRoleContextState,
}: LoveSpaceActionOptions): Pick<LoveSpaceStore, 'syncLoveSpaceRoleContext'> => ({
  syncLoveSpaceRoleContext: () =>
    set((state) => {
      const { state: syncedState } = ensureRoleContextState(state);
      return syncedState;
    }),
});
