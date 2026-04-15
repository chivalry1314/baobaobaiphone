import React from 'react';
import { Unplug } from 'lucide-react';
import { AppIcon } from '../../../../components/AppIcon';

export interface InspectablePhoneApp {
  id: string;
  name: string;
  icon: string;
}

interface RolePhoneDesktopPageProps {
  contactName: string;
  inspectableApps: InspectablePhoneApp[];
  onBackToRoles: () => void;
  onOpenSubApp: (appId: string) => void;
  children?: React.ReactNode;
}

export const RolePhoneDesktopPage: React.FC<RolePhoneDesktopPageProps> = ({
  contactName,
  inspectableApps,
  onBackToRoles,
  onOpenSubApp,
  children,
}) => {
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
          </div>
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
          {inspectableApps.map((app) => (
            <AppIcon
              key={app.id}
              name={app.name}
              icon={app.icon as any}
              label={app.name}
              onClick={() => onOpenSubApp(app.id)}
            />
          ))}
        </div>
      </div>

      {children}
    </div>
  );
};
