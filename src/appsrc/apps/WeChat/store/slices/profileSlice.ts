import type { WeChatState } from '../types';
import { DEFAULT_WECHAT_PAT_SUFFIX } from '../constants';
import type { WeChatRoleContextOptions } from './types';

const createBillRecordId = (): string =>
  `bill_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const createWeChatProfileSlice = ({
  set,
  ensureRoleContextState,
  applyRoleState,
}: WeChatRoleContextOptions): Pick<
  WeChatState,
  | 'updateWeChatUserProfile'
  | 'setWeChatContactPatSuffix'
  | 'topUpWeChatBalance'
  | 'withdrawWeChatBalance'
> => ({
  updateWeChatUserProfile: (profile) =>
    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const nextProfile = { ...roleState.wechatUserProfile, ...profile };
      const shouldSyncMomentAuthor =
        Object.prototype.hasOwnProperty.call(profile, 'name') ||
        Object.prototype.hasOwnProperty.call(profile, 'avatar');

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatUserProfile: nextProfile,
        wechatMoments: shouldSyncMomentAuthor
          ? roleState.wechatMoments.map((moment) =>
              moment.authorId === roleState.wechatUserProfile.id
                ? {
                    ...moment,
                    authorName: nextProfile.name,
                    authorAvatar: nextProfile.avatar,
                  }
                : moment
            )
          : roleState.wechatMoments,
      });
    }),

  setWeChatContactPatSuffix: (contactId, patSuffix) => {
    const normalizedContactId = contactId.trim();
    if (!normalizedContactId) return;

    set((state) => {
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const normalizedSuffix = patSuffix.trim();
      const nextExtensions = { ...roleState.wechatContactExtensions };

      if (!normalizedSuffix || normalizedSuffix === DEFAULT_WECHAT_PAT_SUFFIX) {
        delete nextExtensions[normalizedContactId];
        return applyRoleState(syncedState, roleId, {
          ...roleState,
          wechatContactExtensions: nextExtensions,
        });
      }

      nextExtensions[normalizedContactId] = {
        ...(nextExtensions[normalizedContactId] || {}),
        patSuffix: normalizedSuffix,
      };

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatContactExtensions: nextExtensions,
      });
    });
  },

  topUpWeChatBalance: (amount, meta) =>
    set((state) => {
      if (!Number.isFinite(amount) || amount <= 0) return state;
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const normalizedAmount = Number(amount.toFixed(2));
      const billRecord = {
        id: createBillRecordId(),
        title: (meta?.title || '').trim() || '零钱充值',
        counterparty: (meta?.counterparty || '').trim() || undefined,
        statusText: (meta?.statusText || '').trim() || undefined,
        avatar: (meta?.avatar || '').trim() || undefined,
        amount: normalizedAmount,
        direction: 'income' as const,
        timestamp: Number.isFinite(meta?.timestamp) ? Number(meta?.timestamp) : Date.now(),
      };

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatBills: [billRecord, ...roleState.wechatBills],
        wechatUserProfile: {
          ...roleState.wechatUserProfile,
          balance: Number(((roleState.wechatUserProfile.balance || 0) + normalizedAmount).toFixed(2)),
        },
      });
    }),

  withdrawWeChatBalance: (amount, meta) =>
    set((state) => {
      if (!Number.isFinite(amount) || amount <= 0) return state;
      const { state: syncedState, roleId, roleState } = ensureRoleContextState(state);
      const normalizedAmount = Number(amount.toFixed(2));
      const balance = Number(roleState.wechatUserProfile.balance || 0);
      const finalAmount = normalizedAmount;
      const billRecord = {
        id: createBillRecordId(),
        title: (meta?.title || '').trim() || '微信支付',
        counterparty: (meta?.counterparty || '').trim() || undefined,
        statusText: (meta?.statusText || '').trim() || undefined,
        avatar: (meta?.avatar || '').trim() || undefined,
        amount: finalAmount,
        direction: 'expense' as const,
        timestamp: Number.isFinite(meta?.timestamp) ? Number(meta?.timestamp) : Date.now(),
      };

      return applyRoleState(syncedState, roleId, {
        ...roleState,
        wechatBills: [billRecord, ...roleState.wechatBills],
        wechatUserProfile: {
          ...roleState.wechatUserProfile,
          balance: Number(Math.max(0, balance - finalAmount).toFixed(2)),
        },
      });
    }),
});
