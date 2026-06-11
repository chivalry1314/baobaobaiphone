import type { AppContext } from '../../../core/sdk/types';

export interface AppMarketAppProps {
  onClose: () => void;
  context?: AppContext;
}

export interface OnlineMarketApp {
  id: string;
  name: string;
  icon: string;
  author: string;
  version: string;
  size: string;
  description: string;
  tags: string[];
  html?: string;
}

export interface UploadedMarketApp {
  id: string;
  name: string;
  icon: string;
  version: string;
  description: string;
  html: string;
  createdAt: number;
}

export interface CreateUploadedAppPayload {
  name: string;
  icon: string;
  version: string;
  description: string;
  html: string;
}

export interface AppMarketState {
  installedAppIds: string[];
  uploadedApps: UploadedMarketApp[];
}

export interface RemoteShareTheme {
  protocol: string;
  id: string;
  format: string;
  supported: boolean;
  name: string;
  author: string;
  version: string;
  description: string;
  tags: string[];
  fileName: string;
  mimeType: string;
  size: number;
}

export interface RemoteShareThemeAsset {
  slot: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  downloadUrl: string;
}

export interface RemoteShareThemeCard {
  id: string;
  title: string;
  description: string;
  tags: string[];
  accessMode: 'free' | 'paid';
  updatedAt: string;
  previewUrl: string;
}

export interface RemoteShareThemeCreator {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
}

export interface RemoteShareThemeItem {
  card: RemoteShareThemeCard;
  creator: RemoteShareThemeCreator;
  stats: {
    downloadCount: number;
    lastDownloadedAt: string | null;
  };
  asset: RemoteShareThemeAsset;
  systemTheme: RemoteShareTheme;
  accessCodeStatus: 'none' | 'required' | 'expired' | 'exhausted';
}

export interface RuntimeMarketApp {
  id: string;
  name: string;
  icon: string;
  version: string;
  description: string;
  html: string;
  source: 'online' | 'offline';
}
