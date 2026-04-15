import type { GlobalSettings } from '../sdk/types';

const PUSH_USER_STORAGE_KEY = 'baobaobaiphone.push.userId';
const PUSH_DEVICE_STORAGE_KEY = 'baobaobaiphone.push.deviceId';

export const PUSH_OPEN_APP_MESSAGE_TYPE = 'baobaobaiphone:open-app';

export type PushPermissionState = NotificationPermission | 'unsupported';

export interface PushOpenAppMessage {
  type: typeof PUSH_OPEN_APP_MESSAGE_TYPE;
  appId: string;
  params?: Record<string, unknown>;
}

export interface WebPushCapability {
  supported: boolean;
  secureContext: boolean;
  permission: PushPermissionState;
  reasons: string[];
}

export interface WebPushStatus {
  supported: boolean;
  permission: PushPermissionState;
  endpoint: string | null;
}

export interface PushIdentity {
  userId: string;
  deviceId: string;
  serverBaseUrl: string;
}

export interface EnsurePushSubscriptionResult extends WebPushStatus {
  identity: PushIdentity;
  syncedAt: string;
}

interface JsonObject {
  [key: string]: unknown;
}

const DEFAULT_FETCH_TIMEOUT_MS = 10000;
const DEFAULT_BROWSER_API_TIMEOUT_MS = 15000;
const SUBSCRIPTION_RECOVERY_WAIT_MS = 8000;
const SUBSCRIPTION_RECOVERY_INTERVAL_MS = 400;

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
};

const getEnvPushServerBaseUrl = (): string => {
  const value = toTrimmedString(import.meta.env.VITE_PUSH_SERVER_BASE_URL);
  return value ? trimTrailingSlash(value) : '';
};

const generateId = (prefix: string): string => {
  const random = Math.random().toString(36).slice(2, 10);
  const now = Date.now().toString(36);
  return `${prefix}-${now}-${random}`;
};

const getOrCreateStableId = (storageKey: string, prefix: string): string => {
  if (typeof window === 'undefined') {
    return generateId(prefix);
  }
  const fromStorage = toTrimmedString(window.localStorage.getItem(storageKey));
  if (fromStorage) {
    return fromStorage;
  }
  const next = generateId(prefix);
  window.localStorage.setItem(storageKey, next);
  return next;
};

export const getOrCreatePushUserId = (): string =>
  getOrCreateStableId(PUSH_USER_STORAGE_KEY, 'user');

export const getOrCreatePushDeviceId = (): string =>
  getOrCreateStableId(PUSH_DEVICE_STORAGE_KEY, 'device');

export const resolvePushServerBaseUrl = (
  settings?: Pick<GlobalSettings, 'pushServerBaseUrl'>
): string => {
  const fromSettings = toTrimmedString(settings?.pushServerBaseUrl);
  if (fromSettings) {
    return trimTrailingSlash(fromSettings);
  }

  const fromEnv = getEnvPushServerBaseUrl();
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== 'undefined') {
    return trimTrailingSlash(window.location.origin);
  }

  return '';
};

export const buildPushIdentity = (
  settings: Pick<GlobalSettings, 'pushServerBaseUrl' | 'pushUserId' | 'pushDeviceId'>
): PushIdentity => {
  const userId = toTrimmedString(settings.pushUserId) || getOrCreatePushUserId();
  const deviceId = toTrimmedString(settings.pushDeviceId) || getOrCreatePushDeviceId();
  const serverBaseUrl = resolvePushServerBaseUrl(settings);

  return {
    userId,
    deviceId,
    serverBaseUrl,
  };
};

const parseApiJson = async (response: Response): Promise<JsonObject> => {
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // ignore
  }
  if (!isRecord(data)) {
    return {};
  }
  return data;
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  try {
    return (await Promise.race([promise, timeoutPromise])) as T;
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
};

const assertApiOk = async (response: Response): Promise<JsonObject> => {
  const data = await parseApiJson(response);
  if (!response.ok) {
    const detail =
      toTrimmedString(data.error) ||
      toTrimmedString(data.message) ||
      `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return data;
};

const urlBase64ToArrayBuffer = (base64String: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  // Ensure exact ArrayBuffer for stricter DOM lib BufferSource typing.
  const buffer = new ArrayBuffer(outputArray.byteLength);
  new Uint8Array(buffer).set(outputArray);
  return buffer;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

const recoverSubscriptionAfterTimeout = async (
  registration: ServiceWorkerRegistration,
  waitMs = SUBSCRIPTION_RECOVERY_WAIT_MS
): Promise<PushSubscription | null> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < waitMs) {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return subscription;
    }
    await sleep(SUBSCRIPTION_RECOVERY_INTERVAL_MS);
  }
  return null;
};

const canUseSecureContext = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.isSecureContext) {
    return true;
  }

  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

export const getWebPushCapability = (): WebPushCapability => {
  const reasons: string[] = [];

  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supported: false,
      secureContext: false,
      permission: 'unsupported',
      reasons: ['Not running in browser context'],
    };
  }

  const secureContext = canUseSecureContext();
  const hasNotification = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;

  if (!secureContext) {
    reasons.push('Web Push requires HTTPS (or localhost)');
  }
  if (!hasNotification) {
    reasons.push('Notification API is not supported');
  }
  if (!hasServiceWorker) {
    reasons.push('Service Worker is not supported');
  }
  if (!hasPushManager) {
    reasons.push('PushManager is not supported');
  }

  return {
    supported: reasons.length === 0,
    secureContext,
    permission: hasNotification ? Notification.permission : 'unsupported',
    reasons,
  };
};

export const requestPushPermission = async (): Promise<PushPermissionState> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return Notification.permission;
  }
  return withTimeout(
    Notification.requestPermission(),
    DEFAULT_BROWSER_API_TIMEOUT_MS,
    `Notification permission request timed out after ${DEFAULT_BROWSER_API_TIMEOUT_MS}ms`
  );
};

export const registerWebPushServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  const capability = getWebPushCapability();
  if (!capability.supported || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    return registration;
  } catch (error) {
    console.warn('[WebPush] Service worker registration failed:', toErrorMessage(error));
    return null;
  }
};

const getActiveRegistration = async (): Promise<ServiceWorkerRegistration> => {
  const registration = await registerWebPushServiceWorker();
  if (!registration) {
    throw new Error('Service worker unavailable');
  }
  if (registration.active) {
    return registration;
  }
  const readyRegistration = await withTimeout(
    navigator.serviceWorker.ready,
    DEFAULT_BROWSER_API_TIMEOUT_MS,
    `Service worker activation timed out after ${DEFAULT_BROWSER_API_TIMEOUT_MS}ms`
  );
  if (!readyRegistration.active) {
    throw new Error('Service worker is not active');
  }
  return readyRegistration;
};

export const getWebPushStatus = async (): Promise<WebPushStatus> => {
  const capability = getWebPushCapability();
  if (!capability.supported) {
    return {
      supported: false,
      permission: capability.permission,
      endpoint: null,
    };
  }

  try {
    const registration = await getActiveRegistration();
    const subscription = await registration.pushManager.getSubscription();
    return {
      supported: true,
      permission: Notification.permission,
      endpoint: subscription?.endpoint ?? null,
    };
  } catch {
    return {
      supported: true,
      permission: Notification.permission,
      endpoint: null,
    };
  }
};

const fetchVapidPublicKey = async (serverBaseUrl: string): Promise<string> => {
  const response = await fetchWithTimeout(`${serverBaseUrl}/api/push/vapid-public-key`);
  const data = await assertApiOk(response);
  const publicKey = toTrimmedString(data.publicKey);
  if (!publicKey) {
    throw new Error('VAPID public key is missing in response');
  }
  return publicKey;
};

const upsertSubscription = async (
  serverBaseUrl: string,
  identity: PushIdentity,
  subscription: PushSubscription
): Promise<void> => {
  const response = await fetchWithTimeout(`${serverBaseUrl}/api/push/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: identity.userId,
      deviceId: identity.deviceId,
      appId: 'baobaobaiphone',
      subscription,
    }),
  });
  await assertApiOk(response);
};

export const ensureWebPushSubscription = async (
  settings: Pick<GlobalSettings, 'pushServerBaseUrl' | 'pushUserId' | 'pushDeviceId'>
): Promise<EnsurePushSubscriptionResult> => {
  const capability = getWebPushCapability();
  if (!capability.supported) {
    throw new Error(capability.reasons.join('; ') || 'Web Push is not supported');
  }

  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission is not granted');
  }

  const identity = buildPushIdentity(settings);
  if (!identity.serverBaseUrl) {
    throw new Error('Push server base URL is empty');
  }

  const registration = await getActiveRegistration();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const vapidPublicKey = await fetchVapidPublicKey(identity.serverBaseUrl);
    try {
        subscription = await withTimeout(
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
          }),
        DEFAULT_BROWSER_API_TIMEOUT_MS,
        `Push subscription request timed out after ${DEFAULT_BROWSER_API_TIMEOUT_MS}ms`
      );
    } catch (error) {
      const recovered = await recoverSubscriptionAfterTimeout(registration);
      if (recovered) {
        subscription = recovered;
      } else {
        const detail = toErrorMessage(error);
        throw new Error(
          `${detail}. Browser push service may be unreachable from current network.`
        );
      }
    }
  }

  await upsertSubscription(identity.serverBaseUrl, identity, subscription);

  return {
    supported: true,
    permission,
    endpoint: subscription.endpoint,
    identity,
    syncedAt: new Date().toISOString(),
  };
};

export interface RemoveWebPushSubscriptionResult {
  removedRemote: boolean;
  removedLocal: boolean;
}

export const removeWebPushSubscription = async (
  settings: Pick<GlobalSettings, 'pushServerBaseUrl' | 'pushUserId' | 'pushDeviceId'>
): Promise<RemoveWebPushSubscriptionResult> => {
  const capability = getWebPushCapability();
  if (!capability.supported) {
    return {
      removedRemote: false,
      removedLocal: false,
    };
  }

  const identity = buildPushIdentity(settings);
  const registration = await getActiveRegistration();
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return {
      removedRemote: false,
      removedLocal: false,
    };
  }

  let removedRemote = false;
  try {
    const response = await fetchWithTimeout(`${identity.serverBaseUrl}/api/push/subscriptions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    });
    await assertApiOk(response);
    removedRemote = true;
  } catch (error) {
    console.warn('[WebPush] Failed to remove server subscription:', toErrorMessage(error));
  }

  const removedLocal = await subscription.unsubscribe();

  return {
    removedRemote,
    removedLocal,
  };
};

export interface PushTestResult {
  eventId: string;
}

export const sendWebPushTest = async (
  settings: Pick<GlobalSettings, 'pushServerBaseUrl' | 'pushUserId' | 'pushDeviceId'>
): Promise<PushTestResult> => {
  const identity = buildPushIdentity(settings);
  if (!identity.serverBaseUrl) {
    throw new Error('Push server base URL is empty');
  }

  const response = await fetchWithTimeout(`${identity.serverBaseUrl}/api/push/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: identity.userId,
      title: 'baobaobaiphone Web Push',
      body: 'This is a background push test notification.',
      appId: 'settings',
      params: {
        from: 'push-test',
      },
    }),
  });

  const data = await assertApiOk(response);
  const eventId = toTrimmedString(data.eventId);
  if (!eventId) {
    throw new Error('Push test response did not return eventId');
  }

  return { eventId };
};

export const isPushOpenAppMessage = (value: unknown): value is PushOpenAppMessage => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.type === PUSH_OPEN_APP_MESSAGE_TYPE &&
    typeof value.appId === 'string' &&
    value.appId.trim().length > 0
  );
};
