import React from 'react';
import type { GlobalSettings } from '../../../../core/sdk/types';
import {
  ensureWebPushSubscription,
  getOrCreatePushDeviceId,
  getOrCreatePushUserId,
  getWebPushCapability,
  getWebPushStatus,
  removeWebPushSubscription,
  requestPushPermission,
  resolvePushServerBaseUrl,
  sendWebPushTest,
  type PushPermissionState,
  type WebPushCapability,
  type WebPushStatus,
} from '../../../../core/push/webPush';

interface PushNotificationViewProps {
  settings: GlobalSettings;
  updateSettings: (settings: Partial<GlobalSettings>) => void;
}

type BusyAction = 'permission' | 'subscribe' | 'unsubscribe' | 'test' | null;

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const formatPermissionLabel = (permission: PushPermissionState): string => {
  if (permission === 'granted') {
    return 'granted';
  }
  if (permission === 'denied') {
    return 'denied';
  }
  if (permission === 'default') {
    return 'default';
  }
  return 'unsupported';
};

const shortenEndpoint = (endpoint: string): string => {
  if (endpoint.length <= 74) {
    return endpoint;
  }
  return `${endpoint.slice(0, 32)}...${endpoint.slice(-32)}`;
};

export const PushNotificationView: React.FC<PushNotificationViewProps> = ({
  settings,
  updateSettings,
}) => {
  const [busyAction, setBusyAction] = React.useState<BusyAction>(null);
  const [statusMessage, setStatusMessage] = React.useState<string>('');
  const [capability, setCapability] = React.useState<WebPushCapability>(() =>
    getWebPushCapability()
  );
  const [status, setStatus] = React.useState<WebPushStatus>({
    supported: capability.supported,
    permission: capability.permission,
    endpoint: settings.pushLastEndpoint,
  });

  const refreshClientStatus = React.useCallback(async () => {
    setCapability(getWebPushCapability());
    const next = await getWebPushStatus();
    setStatus(next);
  }, []);

  React.useEffect(() => {
    const patch: Partial<GlobalSettings> = {};
    if (!settings.pushUserId) {
      patch.pushUserId = getOrCreatePushUserId();
    }
    if (!settings.pushDeviceId) {
      patch.pushDeviceId = getOrCreatePushDeviceId();
    }
    if (!settings.pushServerBaseUrl) {
      const fallbackServer = resolvePushServerBaseUrl({
        pushServerBaseUrl: settings.pushServerBaseUrl,
      });
      if (fallbackServer) {
        patch.pushServerBaseUrl = fallbackServer;
      }
    }
    if (Object.keys(patch).length > 0) {
      updateSettings(patch);
    }
  }, [
    settings.pushDeviceId,
    settings.pushServerBaseUrl,
    settings.pushUserId,
    updateSettings,
  ]);

  React.useEffect(() => {
    void refreshClientStatus();
  }, [refreshClientStatus]);

  const handleRequestPermission = async () => {
    setBusyAction('permission');
    try {
      const permission = await requestPushPermission();
      setStatusMessage(`Permission: ${formatPermissionLabel(permission)}`);
      await refreshClientStatus();
    } catch (error) {
      setStatusMessage(`Request permission failed: ${toErrorMessage(error)}`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleEnablePush = async () => {
    setBusyAction('subscribe');
    try {
      const result = await ensureWebPushSubscription(settings);
      updateSettings({
        pushEnabled: true,
        pushUserId: result.identity.userId,
        pushDeviceId: result.identity.deviceId,
        pushServerBaseUrl: result.identity.serverBaseUrl,
        pushLastEndpoint: result.endpoint,
        pushLastSyncedAt: result.syncedAt,
      });
      setStatus({
        supported: result.supported,
        permission: result.permission,
        endpoint: result.endpoint,
      });
      setStatusMessage('Push subscription synced successfully.');
    } catch (error) {
      setStatusMessage(`Enable failed: ${toErrorMessage(error)}`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDisablePush = async () => {
    setBusyAction('unsubscribe');
    try {
      await removeWebPushSubscription(settings);
      updateSettings({
        pushEnabled: false,
        pushLastEndpoint: null,
        pushLastSyncedAt: new Date().toISOString(),
      });
      await refreshClientStatus();
      setStatusMessage('Push subscription removed.');
    } catch (error) {
      setStatusMessage(`Disable failed: ${toErrorMessage(error)}`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSendTest = async () => {
    setBusyAction('test');
    try {
      const response = await sendWebPushTest(settings);
      setStatusMessage(`Test event queued: ${response.eventId}`);
    } catch (error) {
      setStatusMessage(`Test push failed: ${toErrorMessage(error)}`);
    } finally {
      setBusyAction(null);
    }
  };

  const serverBaseUrl =
    settings.pushServerBaseUrl ||
    resolvePushServerBaseUrl({ pushServerBaseUrl: settings.pushServerBaseUrl }) ||
    '';

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
      <section className="space-y-2">
        <h2 className="px-4 text-[13px] text-gray-500 uppercase tracking-wider">Push 状态</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-[15px]">Web Push Support</span>
            <span
              className={`text-[13px] font-medium ${
                status.supported ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {status.supported ? 'Supported' : 'Unsupported'}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-[15px]">Permission</span>
            <span className="text-[13px] text-gray-600">
              {formatPermissionLabel(status.permission)}
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="text-[15px] mb-1">Subscription Endpoint</p>
            <p className="text-[12px] text-gray-500 break-all">
              {status.endpoint ? shortenEndpoint(status.endpoint) : 'Not subscribed'}
            </p>
          </div>
        </div>
        {!capability.supported && capability.reasons.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-700">
            {capability.reasons.join('; ')}
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="px-4 text-[13px] text-gray-500 uppercase tracking-wider">Push 配置</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[15px] mb-1">Push Server URL</p>
            <input
              type="text"
              value={serverBaseUrl}
              onChange={(event) => updateSettings({ pushServerBaseUrl: event.target.value })}
              onBlur={(event) =>
                updateSettings({ pushServerBaseUrl: trimTrailingSlash(event.target.value.trim()) })
              }
              className="w-full text-[14px] text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
              placeholder="http://localhost:8787"
            />
          </div>
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[15px] mb-1">Push User ID</p>
            <input
              type="text"
              value={settings.pushUserId}
              onChange={(event) => updateSettings({ pushUserId: event.target.value })}
              className="w-full text-[14px] text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
              placeholder="user-001"
            />
          </div>
          <div className="px-4 py-3">
            <p className="text-[15px] mb-1">Push Device ID</p>
            <input
              type="text"
              value={settings.pushDeviceId}
              onChange={(event) => updateSettings({ pushDeviceId: event.target.value })}
              className="w-full text-[14px] text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
              placeholder="device-001"
            />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-4 text-[13px] text-gray-500 uppercase tracking-wider">操作</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <button
              onClick={handleRequestPermission}
              disabled={!status.supported || busyAction !== null}
              className="rounded-md bg-indigo-500 px-3 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {busyAction === 'permission' ? 'Requesting...' : 'Request Permission'}
            </button>
            <button
              onClick={handleEnablePush}
              disabled={!status.supported || busyAction !== null}
              className="rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {busyAction === 'subscribe' ? 'Subscribing...' : 'Enable Push'}
            </button>
            <button
              onClick={handleDisablePush}
              disabled={!status.supported || busyAction !== null}
              className="rounded-md bg-gray-600 px-3 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {busyAction === 'unsubscribe' ? 'Disabling...' : 'Disable Push'}
            </button>
            <button
              onClick={handleSendTest}
              disabled={!status.supported || busyAction !== null}
              className="rounded-md bg-blue-500 px-3 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {busyAction === 'test' ? 'Sending...' : 'Send Test Push'}
            </button>
          </div>
          <div className="px-4 py-3 text-[12px] text-gray-500">
            <p className="mb-1">Auto Sync: {settings.pushEnabled ? 'On' : 'Off'}</p>
            <button
              onClick={() => updateSettings({ pushEnabled: !settings.pushEnabled })}
              className={`rounded-md px-3 py-1.5 text-white ${
                settings.pushEnabled ? 'bg-emerald-500' : 'bg-gray-500'
              }`}
            >
              {settings.pushEnabled ? 'Turn Off Auto Sync' : 'Turn On Auto Sync'}
            </button>
          </div>
        </div>
      </section>

      {statusMessage ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-[12px] text-gray-600">
          {statusMessage}
        </div>
      ) : null}
    </div>
  );
};
