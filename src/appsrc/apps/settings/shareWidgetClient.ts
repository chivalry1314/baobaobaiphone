import type { RemoteDesktopComponentItem } from './types';

const DEFAULT_PAGE_SIZE = 24;

export type DiscoverRemoteDesktopComponentsResponse = {
  items: RemoteDesktopComponentItem[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

const toTrimmedText = (value: string): string => value.trim().replace(/\/+$/, '');

export const normalizeShareWidgetSourceBaseUrl = (value: string): string => {
  const trimmed = toTrimmedText(value);
  if (!trimmed) return '';
  return trimmed.endsWith('/api/share') ? trimmed.slice(0, -'/api/share'.length) : trimmed;
};

const resolveShareWidgetApiRoot = (baseUrl: string): string => {
  const root = normalizeShareWidgetSourceBaseUrl(baseUrl);
  if (!root) {
    throw new Error('请先填写分享前端地址');
  }
  return `${root}/api/share`;
};

export const buildRemoteShareWidgetAbsoluteUrl = (baseUrl: string, path: string): string => {
  const root = normalizeShareWidgetSourceBaseUrl(baseUrl);
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

export const discoverRemoteDesktopComponents = async (
  baseUrl: string,
  options?: { page?: number; size?: number }
): Promise<DiscoverRemoteDesktopComponentsResponse> => {
  const params = new URLSearchParams();
  params.set('page', String(options?.page && options.page > 0 ? options.page : 1));
  params.set('size', String(options?.size && options.size > 0 ? options.size : DEFAULT_PAGE_SIZE));
  const apiRoot = resolveShareWidgetApiRoot(baseUrl);
  return requestJson<DiscoverRemoteDesktopComponentsResponse>(
    `${apiRoot}/discover/desktop-components?${params.toString()}`
  );
};

export const downloadRemoteDesktopComponentHtml = async (params: {
  baseUrl: string;
  item: RemoteDesktopComponentItem;
  accessCode?: string;
}): Promise<File> => {
  const targetUrl = new URL(buildRemoteShareWidgetAbsoluteUrl(params.baseUrl, params.item.asset.downloadUrl));
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
    params.item.asset.originalFileName || params.item.desktopComponent.fileName || 'widget.html',
    {
      type: params.item.asset.mimeType || blob.type || 'text/html',
    }
  );
};

export const buildRemoteShareWidgetCardUrl = (baseUrl: string, cardId: string): string =>
  buildRemoteShareWidgetAbsoluteUrl(baseUrl, `/cards/${encodeURIComponent(cardId)}`);
