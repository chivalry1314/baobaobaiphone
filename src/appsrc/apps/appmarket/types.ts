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

export interface RuntimeMarketApp {
  id: string;
  name: string;
  icon: string;
  version: string;
  description: string;
  html: string;
  source: 'online' | 'offline';
}
