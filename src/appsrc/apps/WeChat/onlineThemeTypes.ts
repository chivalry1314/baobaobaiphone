export interface RemoteWechatThemeCard {
  id: string;
  title: string;
  description: string;
  tags: string[];
  accessMode: 'free' | 'paid';
  updatedAt: string;
  previewUrl: string;
}

export interface RemoteWechatThemeCreator {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
}

export interface RemoteWechatThemeAsset {
  slot: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  downloadUrl: string;
}

export interface RemoteWechatTheme {
  protocol: string;
  id: string;
  format: string;
  supported: boolean;
  name: string;
  author: string;
  version: string;
  description: string;
  tags: string[];
  chatBackgroundImage: string;
  chatBackgroundOpacity: number;
  selfBubblePreset: string;
  peerBubblePreset: string;
  rendererSource: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface RemoteWechatThemeItem {
  card: RemoteWechatThemeCard;
  creator: RemoteWechatThemeCreator;
  stats: {
    downloadCount: number;
    lastDownloadedAt: string | null;
  };
  asset: RemoteWechatThemeAsset;
  wechatTheme: RemoteWechatTheme;
  accessCodeStatus: 'none' | 'required' | 'expired' | 'exhausted';
}

export interface WechatThemePackageDescriptor {
  id?: string;
  name?: string;
  author?: string;
  version?: string;
  description?: string;
  tags?: string[];
  chatBackgroundImage?: string;
  chatBackgroundOpacity?: number;
  selfBubblePreset?: string;
  peerBubblePreset?: string;
  rendererSource?: string;
}

export type WechatThemeDefinition = {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  tags: string[];
  chatBackgroundImage: string;
  chatBackgroundOpacity: number;
  selfBubblePreset: 'wechat' | 'rounded' | 'glass' | 'outline';
  peerBubblePreset: 'wechat' | 'rounded' | 'glass' | 'outline';
  rendererSource: string;
  source: 'online' | 'offline';
  importedAt: number;
};
