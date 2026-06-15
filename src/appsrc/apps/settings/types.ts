export interface RemoteDesktopComponentCard {
  id: string;
  title: string;
  description: string;
  tags: string[];
  accessMode: 'free' | 'paid';
  updatedAt: string;
  previewUrl: string;
}

export interface RemoteDesktopComponentCreator {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
}

export interface RemoteDesktopComponentAsset {
  slot: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  downloadUrl: string;
}

export interface RemoteDesktopComponent {
  protocol: string;
  format: string;
  supported: boolean;
  name: string;
  width: number;
  height: number;
  cornerRadius: number;
  frosted: number;
  shadow: number;
  backgroundOpacity: number;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface RemoteDesktopComponentItem {
  card: RemoteDesktopComponentCard;
  creator: RemoteDesktopComponentCreator;
  stats: {
    downloadCount: number;
    lastDownloadedAt: string | null;
  };
  asset: RemoteDesktopComponentAsset;
  desktopComponent: RemoteDesktopComponent;
  accessCodeStatus: 'none' | 'required' | 'expired' | 'exhausted';
}
