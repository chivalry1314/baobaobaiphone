const PUSH_OPEN_APP_MESSAGE_TYPE = 'mimiphone:open-app';

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parsePushPayload = (event) => {
  if (!event.data) {
    return {};
  }

  try {
    const json = event.data.json();
    return isRecord(json) ? json : {};
  } catch {
    try {
      const text = event.data.text();
      return { body: text };
    } catch {
      return {};
    }
  }
};

const normalizeParams = (value) => (isRecord(value) ? value : {});

const buildOpenUrl = (data) => {
  const target = asString(data.url) || '/';
  const url = new URL(target, self.location.origin);
  const appId = asString(data.appId);
  const params = normalizeParams(data.params);

  if (appId) {
    url.searchParams.set('mp_app', appId);
  }
  if (Object.keys(params).length > 0) {
    try {
      url.searchParams.set('mp_params', JSON.stringify(params));
    } catch {
      // ignore serialization errors
    }
  }

  return url.toString();
};

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const title = asString(payload.title) || 'MimiPhone';
  const body = asString(payload.body) || '';
  const data = isRecord(payload.data) ? payload.data : {};

  const options = {
    body,
    icon: asString(payload.icon),
    badge: asString(payload.badge),
    tag: asString(payload.tag),
    requireInteraction: Boolean(payload.requireInteraction),
    data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = isRecord(event.notification.data) ? event.notification.data : {};
  const appId = asString(data.appId);
  const params = normalizeParams(data.params);
  const openPayload = appId
    ? {
        type: PUSH_OPEN_APP_MESSAGE_TYPE,
        appId,
        params,
      }
    : null;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      if (allClients.length > 0) {
        const visibleClient =
          allClients.find((client) => client.visibilityState === 'visible') || allClients[0];
        if (openPayload) {
          visibleClient.postMessage(openPayload);
        }
        await visibleClient.focus();
        return;
      }

      const url = buildOpenUrl(data);
      await self.clients.openWindow(url);
    })()
  );
});

