import React from 'react';
import { ChevronRight, Users } from 'lucide-react';
import type { RoleOption } from '../editorTypes';
import type { DailyScriptPlan } from '../types';

interface RoleListViewProps {
  roleOptions: RoleOption[];
  plans: DailyScriptPlan[];
  onOpenRoleCalendar: (roleId: string) => void;
}

export const RoleListView: React.FC<RoleListViewProps> = ({
  roleOptions,
  plans,
  onOpenRoleCalendar,
}) => {
  return (
    <>
      <section className="rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600">
          <Users size={16} />
          <p className="text-[13px] font-medium">通讯录角色列表</p>
        </div>
        <p className="mt-1 text-[12px] text-slate-500">
          选择一个角色后，会进入该角色的日历，按日期设置剧本。
        </p>
      </section>

      {roleOptions.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white/75 px-4 py-10 text-center">
          <p className="text-[15px] font-medium text-slate-700">通讯录暂无角色</p>
          <p className="mt-1 text-[12px] text-slate-500">
            请先到通讯录新增角色，再回来配置每日剧本。
          </p>
        </section>
      ) : (
        <section className="space-y-2">
          {roleOptions.map((option) => {
            const dateCount = new Set(
              plans
                .filter((plan) => plan.executorRoleId === option.id)
                .map((plan) => plan.dateKey)
            ).size;
            const planCount = plans.filter((plan) => plan.executorRoleId === option.id).length;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onOpenRoleCalendar(option.id)}
                className="w-full rounded-2xl border border-indigo-100 bg-white/90 px-4 py-3 text-left shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-800 truncate">{option.label}</p>
                    <p className="mt-1 text-[12px] text-slate-500">
                      已配置 {dateCount} 天 · 共 {planCount} 个剧本
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>
              </button>
            );
          })}
        </section>
      )}
    </>
  );
};
