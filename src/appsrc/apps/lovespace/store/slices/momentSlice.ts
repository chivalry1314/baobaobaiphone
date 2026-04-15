import type { LoveMomentRecord, LoveSpaceStore } from '../../types';
import type { LoveSpaceActionOptions } from './types';

export const createLoveSpaceMomentSlice = ({
  set,
  ensureRoleContextState,
  applyRoleState,
  generateId,
}: LoveSpaceActionOptions): Pick<
  LoveSpaceStore,
  | 'addMomentRecord'
  | 'updateMomentRecord'
  | 'removeMomentRecord'
  | 'addMomentComment'
  | 'removeMomentComment'
> => ({
  addMomentRecord: (payload) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      const normalizedContent = payload.content.trim();
      const normalizedImage = payload.imageDataUrl?.trim();
      if (!normalizedContent && !normalizedImage) {
        return syncedState;
      }

      const nextMoment: LoveMomentRecord = {
        id: `moment-${generateId()}`,
        bondId: payload.bondId,
        content: normalizedContent,
        imageDataUrl: normalizedImage,
        comments: [],
        happenedAt: Date.now(),
        createdAt: Date.now(),
      };

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        moments: [nextMoment, ...roleState.moments],
      });
    }),

  updateMomentRecord: (payload) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      const normalizedContent = payload.content.trim();
      const normalizedImage = payload.imageDataUrl?.trim();
      if (!normalizedContent && !normalizedImage) {
        return syncedState;
      }

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        moments: roleState.moments.map((item) => {
          if (item.id !== payload.momentId) return item;
          return {
            ...item,
            content: normalizedContent,
            imageDataUrl: normalizedImage,
            comments: item.comments ?? [],
          };
        }),
      });
    }),

  removeMomentRecord: (momentId) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        moments: roleState.moments.filter((item) => item.id !== momentId),
      });
    }),

  addMomentComment: (payload) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      const normalizedContent = payload.content.trim();
      if (!normalizedContent) {
        return syncedState;
      }

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        moments: roleState.moments.map((item) => {
          if (item.id !== payload.momentId) return item;

          return {
            ...item,
            comments: [
              ...(item.comments ?? []),
              {
                id: `moment-comment-${generateId()}`,
                content: normalizedContent,
                createdAt: Date.now(),
              },
            ],
          };
        }),
      });
    }),

  removeMomentComment: (payload) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        moments: roleState.moments.map((item) => {
          if (item.id !== payload.momentId) return item;
          return {
            ...item,
            comments: (item.comments ?? []).filter(
              (comment) => comment.id !== payload.commentId
            ),
          };
        }),
      });
    }),
});
