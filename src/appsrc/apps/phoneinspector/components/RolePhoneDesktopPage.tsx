import React from 'react';
import { LoaderCircle, RefreshCw, Trash2, Unplug } from 'lucide-react';
import { AppIcon } from '../../../../components/AppIcon';

export interface InspectablePhoneApp {
  id: string;
  name: string;
  icon: string;
}

interface RolePhoneDesktopPageProps {
  contactName: string;
  generationStatus?: string;
  isReading?: boolean;
  loadingAppIds?: string[];
  inspectableApps: InspectablePhoneApp[];
  clearTargetApps?: InspectablePhoneApp[];
  isClearPickerOpen?: boolean;
  onBackToRoles: () => void;
  onReconnect: () => void;
  onClearPhone: () => void;
  onCancelClearPhone?: () => void;
  onClearApp?: (appId: string) => void;
  onOpenSubApp: (appId: string) => void;
  children?: React.ReactNode;
}

export const RolePhoneDesktopPage: React.FC<RolePhoneDesktopPageProps> = ({
  contactName,
  generationStatus,
  isReading = false,
  loadingAppIds = [],
  inspectableApps,
  clearTargetApps = inspectableApps,
  isClearPickerOpen = false,
  onBackToRoles,
  onReconnect,
  onClearPhone,
  onCancelClearPhone,
  onClearApp,
  onOpenSubApp,
  children,
}) => {
  const loadingAppIdSet = React.useMemo(() => new Set(loadingAppIds), [loadingAppIds]);

  return (
    <div className="flex-1 relative">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.14),transparent_52%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.14),transparent_56%)]" />

      <div
        className="absolute inset-0 z-10 px-5 pb-8 overflow-y-auto"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex-1 rounded-2xl border border-sky-200 bg-white/90 px-4 py-3 text-[13px] text-slate-700 shadow-[0_10px_24px_-20px_rgba(14,116,144,0.4)]">
            当前正在查看 <span className="font-semibold">{contactName}</span> 的手机桌面
            {generationStatus ? (
              <div className="mt-1 text-[12px] text-slate-500">{generationStatus}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onReconnect}
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-sky-200/90 bg-white/90 text-sky-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] backdrop-blur active:bg-sky-50"
            aria-label="重新连接"
            title="重新连接"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={onBackToRoles}
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 bg-white/90 text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] backdrop-blur active:bg-slate-100"
            aria-label="断开连接"
            title="断开连接"
          >
            <Unplug size={16} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-y-6 gap-x-3 justify-items-center">
          {inspectableApps.map((app) => {
            const isAppLoading = loadingAppIdSet.has(app.id);
            return (
            <div key={app.id} className="relative" aria-disabled={isAppLoading}>
              <AppIcon
                name={app.name}
                icon={app.icon as any}
                label={app.name}
                onClick={() => onOpenSubApp(app.id)}
              />
              {isAppLoading ? (
                <div className="absolute inset-x-[-6px] top-[-6px] bottom-[-18px] z-20 flex flex-col items-center justify-center rounded-3xl bg-slate-100/72 text-slate-500 backdrop-blur-[1px]">
                  <LoaderCircle size={18} className="animate-spin" />
                  <span className="mt-1 text-[10px] font-medium">读取中</span>
                </div>
              ) : null}
            </div>
          );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onClearPhone}
        className="absolute left-10 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-red-200/80 bg-white/82 text-red-500 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.55)] backdrop-blur-xl active:bg-red-50"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 52px)' }}
        aria-label="一键清除"
        title="一键清除"
      >
        <Trash2 size={15} />
      </button>

      {isClearPickerOpen ? (
        <div className="absolute inset-0 z-[80] flex items-end bg-slate-950/18 px-4 backdrop-blur-[2px]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 34px)' }}>
          <div className="w-full rounded-[26px] border border-white/70 bg-white/95 p-4 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.75)]">
            <div className="mb-3 px-1">
              <h3 className="text-[16px] font-semibold text-slate-900">选择要清除的内容</h3>
              <p className="mt-1 text-[12px] leading-5 text-slate-500">
                清除动作会写入 {contactName} 的记忆中心
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {clearTargetApps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onClearApp?.(app.id)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left active:bg-red-50"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-2xl bg-red-50 text-red-500">
                    <Trash2 size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-slate-800">
                      {app.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">清除该 App 内容</span>
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onCancelClearPhone}
              className="mt-3 h-11 w-full rounded-2xl bg-slate-100 text-[14px] font-medium text-slate-600 active:bg-slate-200"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
};
