import type { VaultSession } from './vaultClient';

interface ApiResponse<T> {
  data: T;
}

export interface BaiduConnectorStatus {
  connected: boolean;
  provider: string;
  displayName: string;
  externalUserId: string;
  scope: string;
  expiresAt: string;
  defaultDir: string;
  autoBackupReady: boolean;
}

export interface BaiduBackupItem {
  path: string;
  name: string;
  size: number;
  isDir: number;
  md5: string;
  ctime: number;
  mtime: number;
}

export interface BaiduDownloadResult {
  blob: Blob;
  fileName: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readString = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

const readNumber = (value: unknown, fallback = 0): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const parseApiError = (status: number, fallback: string, payload: unknown): Error => {
  if (isRecord(payload)) {
    const messageCandidates = [payload.error, payload.message, payload.errmsg];
    for (const item of messageCandidates) {
      if (typeof item === 'string' && item.trim()) {
        return new Error(item.trim());
      }
    }
  }

  if (typeof payload === 'string' && payload.trim()) {
    return new Error(`${fallback}: ${payload.trim()}`);
  }

  return new Error(`${fallback} (HTTP ${status})`);
};

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw parseApiError(response.status, 'Baidu connector API request failed', payload);
  }

  return payload as T;
};

const requestBlob = async (url: string, init?: RequestInit): Promise<Response> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    throw parseApiError(response.status, 'Failed to download Baidu backup', payload);
  }
  return response;
};

const authHeaders = (token: string): HeadersInit => {
  return {
    Authorization: `Bearer ${token}`,
  };
};

const ensureData = <T>(payload: unknown): T => {
  if (!isRecord(payload) || !('data' in payload)) {
    throw new Error('Baidu connector API response format is invalid');
  }
  return payload.data as T;
};

const buildQuery = (params: Record<string, string | undefined>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    const cleaned = value.trim();
    if (!cleaned) return;
    query.set(key, cleaned);
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
};

const mapBaiduStatus = (input: unknown): BaiduConnectorStatus => {
  if (!isRecord(input)) {
    throw new Error('Baidu connector status payload is invalid');
  }
  return {
    connected: Boolean(input.connected),
    provider: readString(input.provider),
    displayName: readString(input.display_name),
    externalUserId: readString(input.external_user_id),
    scope: readString(input.scope),
    expiresAt: readString(input.expires_at),
    defaultDir: readString(input.default_dir),
    autoBackupReady: Boolean(input.auto_backup_ready),
  };
};

const mapBaiduBackupItem = (input: unknown): BaiduBackupItem => {
  if (!isRecord(input)) {
    throw new Error('Baidu backup item is invalid');
  }
  return {
    path: readString(input.path),
    name: readString(input.name),
    size: readNumber(input.size),
    isDir: readNumber(input.is_dir),
    md5: readString(input.md5),
    ctime: readNumber(input.ctime),
    mtime: readNumber(input.mtime),
  };
};

const parseAttachmentFileName = (contentDisposition: string | null): string => {
  if (!contentDisposition) return 'backup.json';
  const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(contentDisposition);
  if (!match) return 'backup.json';
  const value = decodeURIComponent(match[1]).trim();
  return value || 'backup.json';
};

export const getBaiduConnectorStatus = async (session: VaultSession): Promise<BaiduConnectorStatus> => {
  const payload = await requestJson<ApiResponse<unknown>>(`${session.baseUrl}/connectors/baidu/status`, {
    headers: authHeaders(session.token),
  });
  return mapBaiduStatus(ensureData(payload));
};

export const getBaiduConnectorAuthURL = async (
  session: VaultSession,
  returnTo?: string
): Promise<string> => {
  const query = buildQuery({
    return_to: returnTo,
  });
  const payload = await requestJson<ApiResponse<{ url?: string }>>(
    `${session.baseUrl}/connectors/baidu/auth-url${query}`,
    {
      headers: authHeaders(session.token),
    }
  );
  const data = ensureData<{ url?: string }>(payload);
  const authURL = typeof data.url === 'string' ? data.url.trim() : '';
  if (!authURL) {
    throw new Error('Baidu auth URL is missing');
  }
  return authURL;
};

export const listBaiduBackups = async (params: {
  session: VaultSession;
  pathPrefix?: string;
}): Promise<BaiduBackupItem[]> => {
  const query = buildQuery({
    path_prefix: params.pathPrefix,
  });
  const payload = await requestJson<ApiResponse<unknown[]>>(
    `${params.session.baseUrl}/connectors/baidu/backups${query}`,
    {
      headers: authHeaders(params.session.token),
    }
  );
  const data = ensureData<unknown[]>(payload);
  const items = Array.isArray(data) ? data.map((item) => mapBaiduBackupItem(item)) : [];
  return items.sort((left, right) => right.mtime - left.mtime);
};

export const uploadBaiduBackup = async (params: {
  session: VaultSession;
  file: Blob;
  fileName?: string;
  pathPrefix?: string;
}): Promise<BaiduBackupItem> => {
  const formData = new FormData();
  const uploadName = params.fileName?.trim() || 'backup.json';
  formData.set('file', params.file, uploadName);
  if (params.pathPrefix?.trim()) {
    formData.set('path_prefix', params.pathPrefix.trim());
  }
  if (params.fileName?.trim()) {
    formData.set('file_name', uploadName);
  }

  const payload = await requestJson<ApiResponse<unknown>>(`${params.session.baseUrl}/connectors/baidu/backup`, {
    method: 'POST',
    headers: authHeaders(params.session.token),
    body: formData,
  });

  return mapBaiduBackupItem(ensureData(payload));
};

export const downloadBaiduBackup = async (params: {
  session: VaultSession;
  path: string;
}): Promise<BaiduDownloadResult> => {
  const query = buildQuery({ path: params.path });
  const response = await requestBlob(`${params.session.baseUrl}/connectors/baidu/download${query}`, {
    headers: authHeaders(params.session.token),
  });

  return {
    blob: await response.blob(),
    fileName: parseAttachmentFileName(response.headers.get('Content-Disposition')),
  };
};

export const deleteBaiduBackup = async (params: {
  session: VaultSession;
  path: string;
}): Promise<void> => {
  const query = buildQuery({ path: params.path });
  await requestJson<ApiResponse<{ deleted?: boolean }>>(
    `${params.session.baseUrl}/connectors/baidu/backup${query}`,
    {
      method: 'DELETE',
      headers: authHeaders(params.session.token),
    }
  );
};

export const disconnectBaiduConnector = async (session: VaultSession): Promise<void> => {
  await requestJson<ApiResponse<{ disconnected?: boolean }>>(
    `${session.baseUrl}/connectors/baidu/disconnect`,
    {
      method: 'POST',
      headers: authHeaders(session.token),
    }
  );
};
