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

export interface RemoteWechatThemeSticker {
  id: string;
  name: string;
  file: string;
}

export interface RemoteWechatThemeStickerPack {
  id: string;
  name: string;
  cover: string;
  stickers: RemoteWechatThemeSticker[];
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
  stickerPacks: RemoteWechatThemeStickerPack[];
  features: string[];
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

export interface WechatThemePackageDescriptorSticker {
  id: string;
  name: string;
  file: string;
}

export interface WechatThemePackageDescriptorStickerPack {
  id: string;
  name: string;
  cover?: string;
  stickers: WechatThemePackageDescriptorSticker[];
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
  stickerPacks?: WechatThemePackageDescriptorStickerPack[];
  features?: string[];
}

export type WechatThemeDefinitionSticker = {
  id: string;
  name: string;
  file: string;
};

export type WechatThemeDefinitionStickerPack = {
  id: string;
  name: string;
  cover: string;
  stickers: WechatThemeDefinitionSticker[];
};

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
  stickerPacks: WechatThemeDefinitionStickerPack[];
  features?: string[];
  source: 'online' | 'offline';
  importedAt: number;
};
