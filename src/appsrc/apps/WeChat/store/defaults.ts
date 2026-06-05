import type {
  WeChatAiChatSettings,
  WeChatAiMomentsSettings,
  WeChatUiSettings,
  WeChatUserProfile,
} from '../types';
import { DEFAULT_WECHAT_PAT_SUFFIX } from './constants';
import type { WeChatRoleScopedState } from './types';

const defaultUserProfile: WeChatUserProfile = {
  id: 'wechat-user',
  name: '我',
  avatar: '',
  wechatId: 'wxid_default',
  description: '这个人很懒，什么都没写',
  region: '北京',
  backgroundImage: '',
  patSuffix: DEFAULT_WECHAT_PAT_SUFFIX,
  balance: 0,
};

const defaultUiSettings: WeChatUiSettings = {
  chatBackgroundImage: '',
  chatBackgroundOpacity: 1,
  selfBubblePreset: 'wechat',
  peerBubblePreset: 'wechat',
  selfBubbleColor: '#bbf7d0',
  customBubbleCss: '',
  customBubbleStyleId: '',
  chatFontFamily: '',
  chatFontData: '',
  customBubbleStyles: [],
  customChatFonts: [],
  customRendererEnabled: false,
  customRendererSource: '',
  hideFloatingBubble: false,
};

const defaultAiMomentsSettings: WeChatAiMomentsSettings = {
  refreshCount: 3,
  includeImages: true,
};

const defaultAiChatSettings: WeChatAiChatSettings = {
  recentMessageCount: 30,
  memoryReferenceCount: 12,
  includePersonalProfileMemory: true,
};

const cloneDefaultUserProfile = (): WeChatUserProfile => ({ ...defaultUserProfile });
const cloneDefaultUiSettings = (): WeChatUiSettings => ({ ...defaultUiSettings });
const cloneDefaultAiChatSettings = (): WeChatAiChatSettings => ({ ...defaultAiChatSettings });
const cloneDefaultAiMomentsSettings = (): WeChatAiMomentsSettings => ({ ...defaultAiMomentsSettings });

export const createDefaultRoleScopedState = (): WeChatRoleScopedState => ({
  wechatSessions: [],
  wechatCurrentSessionId: null,
  wechatBills: [],
  wechatMoments: [],
  wechatUserProfile: cloneDefaultUserProfile(),
  wechatUiSettings: cloneDefaultUiSettings(),
  wechatAiChatSettings: cloneDefaultAiChatSettings(),
  wechatAiMomentsSettings: cloneDefaultAiMomentsSettings(),
  wechatContactExtensions: {},
  wechatDeletedMemorySourceIds: [],
  wechatDeletedMemoryContentHints: [],
});
