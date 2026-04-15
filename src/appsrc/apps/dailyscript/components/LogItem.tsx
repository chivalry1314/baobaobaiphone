import React from 'react';
import { formatLogTime, getStatusBadgeClassName, getStatusLabel } from '../utils';
import type { DailyScriptExecutionLog } from '../types';
import { RoleName } from './RoleName';

interface LogItemProps {
  log: DailyScriptExecutionLog;
}

export const LogItem: React.FC<LogItemProps> = ({ log }) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-slate-800 break-words">
            {log.planName} · {log.stepName}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            {formatLogTime(log.executedAt)} · {log.scheduledTime} · <RoleName roleId={log.roleId} />
          </p>
          <p className="mt-1 text-[12px] text-slate-600 break-words">{log.message}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${getStatusBadgeClassName(
            log.status
          )}`}
        >
          {getStatusLabel(log.status)}
        </span>
      </div>
    </article>
  );
};
