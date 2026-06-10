import type { RemoteShareThemeItem } from './types';

const DEFAULT_PAGE_SIZE = 24;

type DiscoverRemoteShareThemesResponse = {
  items: RemoteShareThemeItem[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

const toTrimmedText = (value: string): string => value.trim().replace(/\/+$/, '');

export const normalizeShareThemeSourceBaseUrl = (value: string): string => {
  const trimmed = toTrimmedText(value);
  if (!trimmed) return '';
  return trimmed.endsWith('/api/share') ? trimmed.slice(0, -'/api/share'.length) : trimmed;
};

const resolveShareThemeApiRoot = (baseUrl: string): string => {
  const root = normalizeShareThemeSourceBaseUrl(baseUrl);
  if (!root) {
    throw new Error('请先填写分享前端地址');
  }
  return `${root}/api/share`;
};

export const buildRemoteShareThemeAbsoluteUrl = (baseUrl: string, path: string): string => {
  const root = normalizeShareThemeSourceBaseUrl(baseUrl);
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

export const discoverRemoteShareThemes = async (
  baseUrl: string,
  options?: { page?: number; size?: number }
): Promise<DiscoverRemoteShareThemesResponse> => {
  const params = new URLSearchParams();
  params.set('page', String(options?.page && options.page > 0 ? options.page : 1));
  params.set('size', String(options?.size && options.size > 0 ? options.size : DEFAULT_PAGE_SIZE));
  const apiRoot = resolveShareThemeApiRoot(baseUrl);
  return requestJson<DiscoverRemoteShareThemesResponse>(`${apiRoot}/discover/system-themes?${params.toString()}`);
};

export const downloadRemoteShareThemePackage = async (params: {
  baseUrl: string;
  item: RemoteShareThemeItem;
  accessCode?: string;
}): Promise<File> => {
  const targetUrl = new URL(buildRemoteShareThemeAbsoluteUrl(params.baseUrl, params.item.asset.downloadUrl));
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
  return new File([blob], params.item.asset.originalFileName || params.item.systemTheme.fileName || 'theme-package.zip', {
    type: params.item.asset.mimeType || blob.type || 'application/octet-stream',
  });
};

export const buildRemoteShareThemeCardUrl = (baseUrl: string, cardId: string): string =>
  buildRemoteShareThemeAbsoluteUrl(baseUrl, `/cards/${encodeURIComponent(cardId)}`);
