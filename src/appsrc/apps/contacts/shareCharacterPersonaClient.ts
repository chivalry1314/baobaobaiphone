export interface RemoteCharacterPersonaCard {
  id: string;
  title: string;
  description: string;
  tags: string[];
  accessMode: 'free' | 'paid';
  updatedAt: string;
  previewUrl: string;
}

export interface RemoteCharacterPersonaCreator {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
}

export interface RemoteCharacterPersonaAsset {
  slot: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  downloadUrl: string;
}

export interface RemoteCharacterPersona {
  protocol: string;
  format: string;
  supported: boolean;
  name: string;
  author: string;
  version: string;
  description: string;
  tags: string[];
  contactCount: number;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface RemoteCharacterPersonaStats {
  downloadCount: number;
  lastDownloadedAt: string | null;
  favoriteCount: number;
}

export interface RemoteCharacterPersonaItem {
  card: RemoteCharacterPersonaCard;
  creator: RemoteCharacterPersonaCreator;
  stats: RemoteCharacterPersonaStats;
  asset: RemoteCharacterPersonaAsset;
  characterPersona: RemoteCharacterPersona;
  accessCodeStatus: 'none' | 'required' | 'expired' | 'exhausted';
}

export interface DiscoverRemoteCharacterPersonasResponse {
  items: RemoteCharacterPersonaItem[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const DEFAULT_PAGE_SIZE = 24;

const toTrimmedText = (value: string): string => value.trim().replace(/\/+$/, '');

export const normalizeShareCharacterPersonaSourceBaseUrl = (value: string): string => {
  const trimmed = toTrimmedText(value);
  if (!trimmed) return '';
  return trimmed.endsWith('/api/share') ? trimmed.slice(0, -'/api/share'.length) : trimmed;
};

const resolveShareCharacterPersonaApiRoot = (baseUrl: string): string => {
  const root = normalizeShareCharacterPersonaSourceBaseUrl(baseUrl);
  if (!root) {
    throw new Error('请先填写分享前端地址');
  }
  return `${root}/api/share`;
};

export const buildRemoteShareCharacterPersonaAbsoluteUrl = (baseUrl: string, path: string): string => {
  const root = normalizeShareCharacterPersonaSourceBaseUrl(baseUrl);
  return new URL(path, `${root}/`).toString();
};

const toErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (typeof payload?.error === 'string' && payload.error.trim()) {
      return payload.error.trim();
    }
  }

  const text = await response.text().catch(() => '');
  return text.trim() || fallback;
};

const requestJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error(await toErrorMessage(response, `请求失败 (${response.status})`));
  }

  return (await response.json()) as T;
};

export const discoverRemoteCharacterPersonas = async (
  baseUrl: string,
  options?: { page?: number; size?: number }
): Promise<DiscoverRemoteCharacterPersonasResponse> => {
  const params = new URLSearchParams();
  params.set('page', String(options?.page && options.page > 0 ? options.page : 1));
  params.set('size', String(options?.size && options.size > 0 ? options.size : DEFAULT_PAGE_SIZE));
  const apiRoot = resolveShareCharacterPersonaApiRoot(baseUrl);
  return requestJson<DiscoverRemoteCharacterPersonasResponse>(
    `${apiRoot}/discover/character-personas?${params.toString()}`
  );
};

export const downloadRemoteCharacterPersonaPackage = async (params: {
  baseUrl: string;
  item: RemoteCharacterPersonaItem;
  accessCode?: string;
}): Promise<File> => {
  const targetUrl = new URL(
    buildRemoteShareCharacterPersonaAbsoluteUrl(params.baseUrl, params.item.asset.downloadUrl)
  );
  const normalizedCode = params.accessCode?.trim().toUpperCase() || '';
  if (normalizedCode) {
    targetUrl.searchParams.set('code', normalizedCode);
  }

  const response = await fetch(targetUrl.toString(), {
    method: 'GET',
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error(await toErrorMessage(response, `下载失败 (${response.status})`));
  }

  const blob = await response.blob();
  return new File(
    [blob],
    params.item.asset.originalFileName || params.item.characterPersona.fileName || 'character-persona.json',
    {
      type: params.item.asset.mimeType || blob.type || 'application/json',
    }
  );
};

export const buildRemoteShareCharacterPersonaCardUrl = (baseUrl: string, cardId: string): string =>
  buildRemoteShareCharacterPersonaAbsoluteUrl(baseUrl, `/cards/${encodeURIComponent(cardId)}`);
