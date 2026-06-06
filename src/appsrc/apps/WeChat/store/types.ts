import type {
  WeChatAiChatSettings,
  WeChatAiMomentsSettings,
  WeChatBillMutationMeta,
  WeChatBillRecord,
  WeChatContactExtension,
  WeChatMessage,
  WeChatMoment,
  WeChatSession,
  WeChatUiSettings,
  WeChatUserProfile,
} from '../types';

export interface WeChatRoleScopedState {
  wechatSessions: WeChatSession[];
  wechatCurrentSessionId: string | null;
  wechatBills: WeChatBillRecord[];
  wechatMoments: WeChatMoment[];
  wechatUserProfile: WeChatUserProfile;
  wechatUiSettings: WeChatUiSettings;
  wechatAiChatSettings: WeChatAiChatSettings;
  wechatAiMomentsSettings: WeChatAiMomentsSettings;
  wechatContactExtensions: Record<string, WeChatContactExtension>;
  wechatDeletedMemorySourceIds: string[];
  wechatDeletedMemoryContentHints: string[];
}

export interface WeChatState extends WeChatRoleScopedState {
  activeRoleId: string;
  wechatStateByRoleId: Record<string, WeChatRoleScopedState>;

  syncWeChatRoleContext: () => void;
  ensureWeChatSession: (characterId: string, options?: { switchCurrent?: boolean }) => string;
  createWeChatSession: (characterId: string) => string;
  addWeChatMessage: (sessionId: string, message: Omit<WeChatMessage, 'id' | 'timestamp'>) => void;
  updateWeChatMessage: (
    sessionId: string,
    messageId: string,
    patch: Partial<Omit<WeChatMessage, 'id' | 'timestamp' | 'role'>>
  ) => void;
  setWeChatCurrentSession: (id: string | null) => void;
  addWeChatMoment: (moment: Omit<WeChatMoment, 'id' | 'timestamp' | 'likes' | 'comments'>) => void;
  toggleWeChatMomentLike: (momentId: string, userId: string) => void;
  addWeChatMomentComment: (
    momentId: string,
    comment: Omit<WeChatMoment['comments'][number], 'id'>
  ) => void;
  updateWeChatUserProfile: (profile: Partial<WeChatUserProfile>) => void;
  updateWeChatUiSettings: (settings: Partial<WeChatUiSettings>) => void;
  updateWeChatAiChatSettings: (settings: Partial<WeChatAiChatSettings>) => void;
  updateWeChatAiMomentsSettings: (settings: Partial<WeChatAiMomentsSettings>) => void;
  setWeChatContactPatSuffix: (contactId: string, patSuffix: string) => void;
  deleteWeChatContact: (contactId: string) => void;
  hideWeChatSession: (sessionId: string) => void;
  deleteWeChatSession: (sessionId: string) => void;
  deleteWeChatMessages: (sessionId: string, messageIds: string[]) => void;
  updateWeChatSessionSettings: (
    sessionId: string,
    settings: Partial<Omit<WeChatSession, 'id' | 'characterId' | 'messages' | 'lastUpdated' | 'unreadCount'>>
  ) => void;
  importWeChatInspectorSnapshot: (
    roleId: string,
    snapshot: {
      sourceContactId: string;
      sessions: WeChatSession[];
      bills: WeChatBillRecord[];
    }
  ) => void;
  clearWeChatInspectorSnapshot: (roleId: string, sourceContactId: string) => void;
  clearWeChatInspectorContacts: (roleId: string, sourceContactId: string) => void;
  topUpWeChatBalance: (amount: number, meta?: WeChatBillMutationMeta) => void;
  withdrawWeChatBalance: (amount: number, meta?: WeChatBillMutationMeta) => void;
}
