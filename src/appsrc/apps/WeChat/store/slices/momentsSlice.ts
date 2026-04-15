import type { WeChatState } from '../types';
import type { WeChatRoleContextOptions } from './types';

export const createWeChatMomentsSlice = ({
  set,
  ensureRoleContextState,
  applyRoleState,
  generateId,
}: WeChatRoleContextOptions): Pick<
  WeChatState,
  'addWeChatMoment' | 'toggleWeChatMomentLike' | 'addWeChatMomentComment'
> => ({
  addWeChatMoment: (moment) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatMoments: [
          {
            ...moment,
            id: generateId(),
            timestamp: Date.now(),
            likes: [],
            comments: [],
          },
          ...roleState.wechatMoments,
        ],
      });
    }),

  toggleWeChatMomentLike: (momentId, userId) => {
    const normalizedMomentId = momentId.trim();
    const normalizedUserId = userId.trim();
    if (!normalizedMomentId || !normalizedUserId) return;

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatMoments: roleState.wechatMoments.map((moment) => {
          if (moment.id !== normalizedMomentId) return moment;
          const hasLiked = moment.likes.includes(normalizedUserId);
          return {
            ...moment,
            likes: hasLiked
              ? moment.likes.filter((likedUserId) => likedUserId !== normalizedUserId)
              : [...moment.likes, normalizedUserId],
          };
        }),
      });
    });
  },

  addWeChatMomentComment: (momentId, comment) => {
    const normalizedMomentId = momentId.trim();
    if (!normalizedMomentId) return;

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatMoments: roleState.wechatMoments.map((moment) =>
          moment.id !== normalizedMomentId
            ? moment
            : {
                ...moment,
                comments: [
                  ...moment.comments,
                  {
                    ...comment,
                    id: generateId(),
                  },
                ],
              }
        ),
      });
    });
  },
});
