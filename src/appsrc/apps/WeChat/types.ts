import type { AppMemoryRecord } from '../../../core/appMemory';
import type { AppContext } from '../../../core/sdk/types';
import type { DeliveryOrderItem } from '../delivery/types';

export interface WeChatCharacter {
  id: string;
  name: string;
  avatar: string;
  description: string;
  greeting: string;
  personality: string;
  background: string;
  patSuffix?: string;
  worldBookId?: string;
}

export interface WeChatMessage {
  id: string;
  role: 'user' | 'character';
  content: string;
  timestamp: number;
  quoteText?: string;
  assistantReplyPending?: boolean;
  type?:
    | 'text'
    | 'transfer'
    | 'transfer_accepted'
    | 'pat'
    | 'voice'
    | 'image'
    | 'order_request'
    | 'movie_ticket'
    | 'gift_delivery'
    | 'recipe_card'
    | 'shopping_invite';
  amount?: number;
  appSource?: 'shopping' | 'delivery';
  orderRequestStatus?: 'pending' | 'accepted' | 'rejected';
  orderIds?: string[];
  orderPreview?: WeChatOrderPreview;
  deliveryOrderItems?: DeliveryOrderItem[];
  deliveryAddress?: {
    title: string;
    recipient: string;
    phone: string;
  };
  giftDelivery?: WeChatGiftDeliveryCard;
  recipeCard?: WeChatRecipeCard;
  shoppingInvite?: {
    mode: 'together';
    inviterName?: string;
    inviteText?: string;
  };
  movieTicket?: {
    orderId: string;
    movieTitle: string;
    cinema: string;
    date: string;
    time: string;
    hall: string;
    seat: string;
    qty: number;
    pickupCode: string;
  };
  voiceAudioDataUrl?: string;
  voiceDurationSeconds?: number;
  voiceTranscriptText?: string;
  voiceTranscriptVisible?: boolean;
  imageDataUrl?: string;
  imageMimeType?: string;
}

export interface WeChatOrderPreviewItem {
  name: string;
  qty: number;
}

export interface WeChatOrderPreview {
  storeNames?: string[];
  items: WeChatOrderPreviewItem[];
  totalItemCount?: number;
}

export interface WeChatGiftDeliveryCard {
  orderId: string;
  title: string;
  subtitle?: string;
  productName: string;
  coverEmoji?: string;
  deliveryStage?: string;
  deliveryEtaMinutes?: number;
  recipientName?: string;
  addressTitle?: string;
}

export interface WeChatRecipeCard {
  recipeId: string;
  title: string;
  subtitle: string;
  accent?: string;
  time: string;
  servings: string;
  shareText: string;
  ingredients: Array<{
    name: string;
    amount: string;
  }>;
  steps: string[];
}

export interface WeChatSession {
  id: string;
  characterId: string;
  messages: WeChatMessage[];
  lastUpdated: number;
  unreadCount: number;
}

export interface WeChatMoment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  images: string[];
  timestamp: number;
  likes: string[];
  comments: {
    id: string;
    authorName: string;
    content: string;
  }[];
}

export interface WeChatUserProfile {
  id: string;
  name: string;
  avatar: string;
  wechatId: string;
  description: string;
  region: string;
  backgroundImage: string;
  patSuffix: string;
  balance?: number;
}

export type WeChatBillDirection = 'income' | 'expense';

export interface WeChatBillRecord {
  id: string;
  title: string;
  counterparty?: string;
  amount: number;
  direction: WeChatBillDirection;
  timestamp: number;
  statusText?: string;
  avatar?: string;
}

export interface WeChatBillMutationMeta {
  title?: string;
  counterparty?: string;
  statusText?: string;
  timestamp?: number;
  avatar?: string;
}

export type WeChatBubblePreset = 'wechat' | 'rounded' | 'glass' | 'outline';

export interface WeChatUiRenderConfig {
  chatBackgroundImage?: string;
  chatBackgroundStyle?: Record<string, string | number>;
  selfBubbleStyle?: Record<string, string | number>;
  peerBubbleStyle?: Record<string, string | number>;
  selfTextStyle?: Record<string, string | number>;
  peerTextStyle?: Record<string, string | number>;
}

export interface WeChatUiSettings {
  chatBackgroundImage: string;
  chatBackgroundOpacity: number;
  selfBubblePreset: WeChatBubblePreset;
  peerBubblePreset: WeChatBubblePreset;
  customRendererEnabled: boolean;
  customRendererSource: string;
}

export interface WeChatAiMomentsSettings {
  refreshCount: number;
  includeImages: boolean;
}

export interface WeChatAiChatSettings {
  recentMessageCount: number;
  memoryReferenceCount: number;
  includePersonalProfileMemory: boolean;
}

export interface WeChatContactExtension {
  patSuffix?: string;
}

export interface WeChatInteractionMemoryRecord extends AppMemoryRecord {
  appId: 'wechat';
  sourceType?: WeChatMessage['type'];
}

export type WeChatTab = 'chat' | 'contacts' | 'discover' | 'profile';

export type WeChatView =
  | 'main'
  | 'chat'
  | 'newFriends'
  | 'addFriend'
  | 'moments'
  | 'contactProfile'
  | 'editCharacter'
  | 'editMyProfile'
  | 'editMyName'
  | 'editPatSetting'
  | 'settings'
  | 'chatUiOptimize'
  | 'aiChatContextConfig'
  | 'momentsSettings'
  | 'aiMomentsConfig'
  | 'services'
  | 'wallet'
  | 'bill'
  | 'balance'
  | 'topUp'
  | 'withdraw';

export interface WeChatAppProps {
  onClose: () => void;
  context?: AppContext;
}

export interface WeChatTabBarProps {
  activeTab: WeChatTab;
  onTabChange: (tab: WeChatTab) => void;
}

export interface WeChatChatsProps {
  onSelectChat: (characterId: string) => void;
}

export interface WeChatContactsProps {
  onSelectContact: (characterId: string) => void;
  onOpenNewFriends: () => void;
}

export interface WeChatChatViewProps {
  characterId: string;
  onBack: () => void;
  onReturnToShopping?: () => void;
  returnToShoppingLabel?: string;
  restoreVoiceCallSignal?: number;
  onVoiceCallUiStateChange?: (state: WeChatVoiceCallUiState) => void;
  readOnly?: boolean;
}

export interface WeChatVoiceCallUiState {
  active: boolean;
  minimized: boolean;
  characterId: string;
  characterName: string;
  characterAvatar?: string;
}

export interface WeChatNewFriendsViewProps {
  onBack: () => void;
}

export interface WeChatAddFriendViewProps {
  onBack: () => void;
}

export interface WeChatDiscoverProps {
  onMomentsClick: () => void;
}

export interface WeChatMomentsViewProps {
  onBack: () => void;
  focusAuthorId?: string | null;
}

export interface WeChatSettingsViewProps {
  onBack: () => void;
  onChatUiOptimizeClick: () => void;
  onAiChatContextConfigClick: () => void;
  onMomentsSettingsClick: () => void;
  onAiMomentsConfigClick: () => void;
}

export interface WeChatChatUiOptimizeViewProps {
  onBack: () => void;
}

export interface WeChatMomentsSettingsViewProps {
  onBack: () => void;
}

export interface WeChatAiMomentsConfigViewProps {
  onBack: () => void;
}

export interface WeChatAiChatContextConfigViewProps {
  onBack: () => void;
}

export interface WeChatProfileProps {
  onClose: () => void;
  onEditProfile: () => void;
  onServicesClick: () => void;
  onMomentsClick: () => void;
  onSettingsClick: () => void;
  readOnly?: boolean;
}

