export interface RemoteWorldBookCard {
  id: string;
  title: string;
  description: string;
  tags: string[];
  accessMode: 'free' | 'paid';
  updatedAt: string;
  previewUrl: string;
}

export interface RemoteWorldBookCreator {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
}

export interface RemoteWorldBookAsset {
  slot: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  downloadUrl: string;
}

export interface RemoteWorldBook {
  protocol: string;
  format: string;
  supported: boolean;
  name: string;
  author: string;
  version: string;
  description: string;
  tags: string[];
  entryCount: number;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface RemoteWorldBookStats {
  downloadCount: number;
  lastDownloadedAt: string | null;
  favoriteCount: number;
}

export interface RemoteWorldBookItem {
  card: RemoteWorldBookCard;
  creator: RemoteWorldBookCreator;
  stats: RemoteWorldBookStats;
  asset: RemoteWorldBookAsset;
  worldBook: RemoteWorldBook;
  accessCodeStatus: 'none' | 'required' | 'expired' | 'exhausted';
}

export interface DiscoverRemoteWorldBooksResponse {
  items: RemoteWorldBookItem[];
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

export const normalizeShareWorldBookSourceBaseUrl = (value: string): string => {
  const trimmed = toTrimmedText(value);
  if (!trimmed) return '';
  return trimmed.endsWith('/api/share') ? trimmed.slice(0, -'/api/share'.length) : trimmed;
};

const resolveShareWorldBookApiRoot = (baseUrl: string): string => {
  const root = normalizeShareWorldBookSourceBaseUrl(baseUrl);
  if (!root) {
    throw new Error('请先填写分享前端地址');
  }
  return `${root}/api/share`;
};

export const buildRemoteShareWorldBookAbsoluteUrl = (baseUrl: string, path: string): string => {
  const root = normalizeShareWorldBookSourceBaseUrl(baseUrl);
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

export const discoverRemoteWorldBooks = async (
  baseUrl: string,
  options?: { page?: number; size?: number }
): Promise<DiscoverRemoteWorldBooksResponse> => {
  const params = new URLSearchParams();
  params.set('page', String(options?.page && options.page > 0 ? options.page : 1));
  params.set('size', String(options?.size && options.size > 0 ? options.size : DEFAULT_PAGE_SIZE));
  const apiRoot = resolveShareWorldBookApiRoot(baseUrl);
  return requestJson<DiscoverRemoteWorldBooksResponse>(
    `${apiRoot}/discover/world-books?${params.toString()}`
  );
};

export const downloadRemoteWorldBookPackage = async (params: {
  baseUrl: string;
  item: RemoteWorldBookItem;
  accessCode?: string;
}): Promise<File> => {
  const targetUrl = new URL(
    buildRemoteShareWorldBookAbsoluteUrl(params.baseUrl, params.item.asset.downloadUrl)
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
    params.item.asset.originalFileName || params.item.worldBook.fileName || 'worldbook.json',
    {
      type: params.item.asset.mimeType || blob.type || 'application/json',
    }
  );
};

export const buildRemoteShareWorldBookCardUrl = (baseUrl: string, cardId: string): string =>
  buildRemoteShareWorldBookAbsoluteUrl(baseUrl, `/cards/${encodeURIComponent(cardId)}`);
