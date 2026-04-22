export interface VaultTenantOption {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  userId: string;
  username: string;
}

export interface VaultSession {
  baseUrl: string;
  token: string;
  expiresAt: string;
  userId: string;
  username: string;
  email: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
}

export interface VaultLoginResult {
  baseUrl: string;
  requiresTenantSelection: boolean;
  tenantOptions: VaultTenantOption[];
  session: VaultSession | null;
}

export interface VaultNamespace {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  status: string;
  isDefault: boolean;
}

export interface VaultObjectItem {
  id: string;
  key: string;
  name: string;
  size: number;
  contentType: string;
  etag: string;
  createdAt: string;
  updatedAt: string;
  lastModified: string;
}

interface VaultApiResponse<T> {
  data: T;
}

interface VaultPageResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

const DEFAULT_PAGE_SIZE = 200;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readString = (input: unknown, fallback = ''): string => {
  return typeof input === 'string' ? input : fallback;
};

const readNumber = (input: unknown, fallback = 0): number => {
  return typeof input === 'number' && Number.isFinite(input) ? input : fallback;
};

const normalizeOriginPath = (raw: string): string => {
  const value = raw.trim();
  if (!value) return '/api/v1';
  const path = value.startsWith('/') ? value : `/${value}`;
  const cleaned = path.replace(/\/+$/, '');
  if (cleaned.endsWith('/api/v1')) return cleaned;
  if (cleaned.endsWith('/api')) return `${cleaned}/v1`;
  return `${cleaned}/api/v1`;
};

const parseApiError = (status: number, fallback: string, payload: unknown): Error => {
  if (isRecord(payload) && typeof payload.error === 'string' && payload.error.trim()) {
    return new Error(payload.error.trim());
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
    throw parseApiError(response.status, 'Vault API request failed', payload);
  }

  return payload as T;
};

const authHeaders = (token: string): HeadersInit => {
  return {
    Authorization: `Bearer ${token}`,
  };
};

const ensureData = <T>(payload: unknown): T => {
  if (!isRecord(payload) || !('data' in payload)) {
    throw new Error('Vault API response format is invalid');
  }
  return payload.data as T;
};

const buildQuery = (params: Record<string, string | number | undefined>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    const stringValue = String(value).trim();
    if (!stringValue) return;
    query.set(key, stringValue);
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
};

const mapTenantOption = (payload: unknown): VaultTenantOption => {
  if (!isRecord(payload)) {
    throw new Error('Vault tenant option is invalid');
  }
  return {
    tenantId: readString(payload.tenant_id),
    tenantCode: readString(payload.tenant_code),
    tenantName: readString(payload.tenant_name),
    userId: readString(payload.user_id),
    username: readString(payload.username),
  };
};

const mapSession = (baseUrl: string, authPayload: unknown): VaultSession => {
  if (!isRecord(authPayload)) {
    throw new Error('Vault auth payload is invalid');
  }
  const user = isRecord(authPayload.user) ? authPayload.user : {};
  const tenant = isRecord(authPayload.tenant) ? authPayload.tenant : {};

  const token = readString(authPayload.token);
  if (!token) {
    throw new Error('Vault auth token is missing');
  }

  const tenantId = readString(tenant.id);
  if (!tenantId) {
    throw new Error('Vault tenant id is missing');
  }

  return {
    baseUrl,
    token,
    expiresAt: readString(authPayload.expires_at),
    userId: readString(user.id),
    username: readString(user.username),
    email: readString(user.email),
    tenantId,
    tenantCode: readString(tenant.code),
    tenantName: readString(tenant.name),
  };
};

const mapNamespace = (payload: unknown): VaultNamespace => {
  if (!isRecord(payload)) {
    throw new Error('Vault namespace item is invalid');
  }
  return {
    id: readString(payload.id),
    tenantId: readString(payload.tenant_id),
    name: readString(payload.name),
    description: readString(payload.description),
    status: readString(payload.status),
    isDefault: Boolean(payload.is_default),
  };
};

const mapObject = (payload: unknown): VaultObjectItem => {
  if (!isRecord(payload)) {
    throw new Error('Vault object item is invalid');
  }
  return {
    id: readString(payload.id),
    key: readString(payload.key),
    name: readString(payload.name),
    size: readNumber(payload.size),
    contentType: readString(payload.content_type),
    etag: readString(payload.etag),
    createdAt: readString(payload.created_at),
    updatedAt: readString(payload.updated_at),
    lastModified: readString(payload.last_modified),
  };
};

const listAllPages = async <T>(
  loader: (page: number, pageSize: number) => Promise<VaultPageResponse<T>>
): Promise<T[]> => {
  const items: T[] = [];
  let page = 1;
  const pageSize = DEFAULT_PAGE_SIZE;

  while (true) {
    const response = await loader(page, pageSize);
    const pageItems = Array.isArray(response.items) ? response.items : [];
    items.push(...pageItems);

    if (pageItems.length === 0) break;
    if (items.length >= response.total) break;
    page += 1;
  }

  return items;
};

export const normalizeVaultBaseUrl = (raw: string): string => {
  const value = raw.trim();
  if (!value) {
    throw new Error('Vault URL is required');
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Vault URL is invalid');
  }

  const path = normalizeOriginPath(parsed.pathname);
  return `${parsed.origin}${path}`;
};

export const vaultLogin = async (params: {
  baseUrl: string;
  email: string;
  password: string;
  tenantCode?: string;
}): Promise<VaultLoginResult> => {
  const baseUrl = normalizeVaultBaseUrl(params.baseUrl);
  const email = params.email.trim();
  const password = params.password;
  const tenantCode = params.tenantCode?.trim() ?? '';

  if (!email) {
    throw new Error('Vault email is required');
  }
  if (!password) {
    throw new Error('Vault password is required');
  }

  const payload = await requestJson<VaultApiResponse<unknown>>(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenant_code: tenantCode || undefined,
      email,
      password,
    }),
  });

  const data = ensureData<Record<string, unknown>>(payload);
  const requiresTenantSelection = Boolean(data.requires_tenant_selection);
  const tenantOptions = Array.isArray(data.tenant_options)
    ? data.tenant_options.map((item) => mapTenantOption(item))
    : [];
  const session = data.auth ? mapSession(baseUrl, data.auth) : null;

  return {
    baseUrl,
    requiresTenantSelection,
    tenantOptions,
    session,
  };
};

export const listVaultNamespaces = async (session: VaultSession): Promise<VaultNamespace[]> => {
  const items = await listAllPages(async (page, pageSize) => {
    const query = buildQuery({
      page,
      page_size: pageSize,
      status: 'active',
    });
    return requestJson<VaultPageResponse<unknown>>(`${session.baseUrl}/namespaces${query}`, {
      headers: authHeaders(session.token),
    });
  });

  return items.map((item) => mapNamespace(item)).filter((item) => item.id);
};

export const listVaultObjects = async (params: {
  session: VaultSession;
  namespaceId: string;
  prefix?: string;
}): Promise<VaultObjectItem[]> => {
  const namespaceId = params.namespaceId.trim();
  if (!namespaceId) {
    throw new Error('Namespace is required');
  }

  const prefix = params.prefix?.trim();
  const items = await listAllPages(async (page, pageSize) => {
    const query = buildQuery({
      namespace_id: namespaceId,
      prefix: prefix || undefined,
      page,
      page_size: pageSize,
    });
    return requestJson<VaultPageResponse<unknown>>(
      `${params.session.baseUrl}/storage/objects${query}`,
      {
        headers: authHeaders(params.session.token),
      }
    );
  });

  return items
    .map((item) => mapObject(item))
    .filter((item) => item.key)
    .sort((left, right) => {
      const leftTime = Date.parse(left.updatedAt || left.lastModified || left.createdAt || '');
      const rightTime = Date.parse(right.updatedAt || right.lastModified || right.createdAt || '');
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    });
};

export const uploadVaultObject = async (params: {
  session: VaultSession;
  namespaceId: string;
  key: string;
  file: Blob;
  contentType?: string;
}): Promise<VaultObjectItem> => {
  const namespaceId = params.namespaceId.trim();
  const key = params.key.trim();
  if (!namespaceId || !key) {
    throw new Error('Namespace and object key are required');
  }

  const formData = new FormData();
  formData.set('namespace_id', namespaceId);
  formData.set('key', key);
  formData.set('content_type', params.contentType?.trim() || 'application/json');
  formData.set('file', params.file, key.split('/').pop() || 'backup.json');

  const payload = await requestJson<VaultApiResponse<unknown>>(
    `${params.session.baseUrl}/storage/objects/upload`,
    {
      method: 'POST',
      headers: authHeaders(params.session.token),
      body: formData,
    }
  );

  return mapObject(ensureData(payload));
};

export const downloadVaultObject = async (params: {
  session: VaultSession;
  namespaceId: string;
  key: string;
}): Promise<Blob> => {
  const namespaceId = params.namespaceId.trim();
  const key = params.key.trim();
  if (!namespaceId || !key) {
    throw new Error('Namespace and object key are required');
  }

  const query = buildQuery({ namespace_id: namespaceId, key });
  const response = await fetch(`${params.session.baseUrl}/storage/objects/download${query}`, {
    headers: authHeaders(params.session.token),
  });

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
    throw parseApiError(response.status, 'Failed to download Vault object', payload);
  }

  return response.blob();
};

export const deleteVaultObject = async (params: {
  session: VaultSession;
  namespaceId: string;
  key: string;
}): Promise<void> => {
  const namespaceId = params.namespaceId.trim();
  const key = params.key.trim();
  if (!namespaceId || !key) {
    throw new Error('Namespace and object key are required');
  }

  const query = buildQuery({ namespace_id: namespaceId, key });
  await requestJson<VaultApiResponse<{ deleted?: boolean }>>(
    `${params.session.baseUrl}/storage/objects${query}`,
    {
      method: 'DELETE',
      headers: authHeaders(params.session.token),
    }
  );
};

