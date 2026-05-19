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
  return '未知错误';
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const formatPermissionLabel = (permission: PushPermissionState): string => {
  if (permission === 'granted') {
    return '已允许';
  }
  if (permission === 'denied') {
    return '已拒绝';
  }
  if (permission === 'default') {
    return '未设置';
  }
  return '不支持';
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
    let cancelled = false;

    const hydratePushIdentityDefaults = async () => {
      const patch: Partial<GlobalSettings> = {};
      if (!settings.pushUserId) {
        patch.pushUserId = await getOrCreatePushUserId();
      }
      if (!settings.pushDeviceId) {
        patch.pushDeviceId = await getOrCreatePushDeviceId();
      }
      if (!settings.pushServerBaseUrl) {
        const fallbackServer = resolvePushServerBaseUrl({
          pushServerBaseUrl: settings.pushServerBaseUrl,
        });
        if (fallbackServer) {
          patch.pushServerBaseUrl = fallbackServer;
        }
      }
      if (!cancelled && Object.keys(patch).length > 0) {
        updateSettings(patch);
      }
    };

    void hydratePushIdentityDefaults();

    return () => {
      cancelled = true;
    };
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
      setStatusMessage(`通知权限：${formatPermissionLabel(permission)}`);
      await refreshClientStatus();
    } catch (error) {
      setStatusMessage(`请求通知权限失败：${toErrorMessage(error)}`);
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
      setStatusMessage('推送订阅已同步。');
    } catch (error) {
      setStatusMessage(`启用推送失败：${toErrorMessage(error)}`);
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
      setStatusMessage('推送订阅已移除。');
    } catch (error) {
      setStatusMessage(`关闭推送失败：${toErrorMessage(error)}`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSendTest = async () => {
    setBusyAction('test');
    try {
      const response = await sendWebPushTest(settings);
      setStatusMessage(`测试推送已加入队列：${response.eventId}`);
    } catch (error) {
      setStatusMessage(`发送测试推送失败：${toErrorMessage(error)}`);
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
        <h2 className="px-4 text-[13px] text-gray-500 tracking-wider">推送状态</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-[15px]">网页推送支持</span>
            <span
              className={`text-[13px] font-medium ${
                status.supported ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {status.supported ? '支持' : '不支持'}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-[15px]">通知权限</span>
            <span className="text-[13px] text-gray-600">
              {formatPermissionLabel(status.permission)}
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="text-[15px] mb-1">订阅地址</p>
            <p className="text-[12px] text-gray-500 break-all">
              {status.endpoint ? shortenEndpoint(status.endpoint) : '未订阅'}
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
        <h2 className="px-4 text-[13px] text-gray-500 tracking-wider">推送配置</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[15px] mb-1">推送服务地址</p>
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
            <p className="text-[15px] mb-1">推送用户 ID</p>
            <input
              type="text"
              value={settings.pushUserId}
              onChange={(event) => updateSettings({ pushUserId: event.target.value })}
              className="w-full text-[14px] text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
              placeholder="user-001"
            />
          </div>
          <div className="px-4 py-3">
            <p className="text-[15px] mb-1">推送设备 ID</p>
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
              {busyAction === 'permission' ? '请求中...' : '请求权限'}
            </button>
            <button
              onClick={handleEnablePush}
              disabled={!status.supported || busyAction !== null}
              className="rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {busyAction === 'subscribe' ? '订阅中...' : '启用推送'}
            </button>
            <button
              onClick={handleDisablePush}
              disabled={!status.supported || busyAction !== null}
              className="rounded-md bg-gray-600 px-3 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {busyAction === 'unsubscribe' ? '关闭中...' : '关闭推送'}
            </button>
            <button
              onClick={handleSendTest}
              disabled={!status.supported || busyAction !== null}
              className="rounded-md bg-blue-500 px-3 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {busyAction === 'test' ? '发送中...' : '发送测试推送'}
            </button>
          </div>
          <div className="px-4 py-3 text-[12px] text-gray-500">
            <p className="mb-1">自动同步：{settings.pushEnabled ? '开启' : '关闭'}</p>
            <button
              onClick={() => updateSettings({ pushEnabled: !settings.pushEnabled })}
              className={`rounded-md px-3 py-1.5 text-white ${
                settings.pushEnabled ? 'bg-emerald-500' : 'bg-gray-500'
              }`}
            >
              {settings.pushEnabled ? '关闭自动同步' : '开启自动同步'}
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
