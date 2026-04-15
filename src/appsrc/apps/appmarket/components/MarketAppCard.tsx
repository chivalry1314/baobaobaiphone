import React from 'react';
import { CheckCircle2, Download, Trash2 } from 'lucide-react';

import { TEXT } from '../constants';

interface MarketAppCardProps {
  icon: string;
  name: string;
  description: string;
  version: string;
  meta: string;
  tags?: string[];
  isInstalled: boolean;
  isBusy?: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onDeletePermanent?: () => void;
}

export const MarketAppCard: React.FC<MarketAppCardProps> = ({
  icon,
  name,
  description,
  version,
  meta,
  tags = [],
  isInstalled,
  isBusy = false,
  onInstall,
  onUninstall,
  onDeletePermanent,
}) => {
  const installLabel = isBusy ? TEXT.installing : TEXT.install;

  return (
    <article className="rounded-3xl bg-white/90 border border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.08)] p-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 grid place-items-center text-[24px]">{icon}</div>

        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-[16px] text-slate-900 font-semibold truncate">{name}</h3>
          <p className="text-[12px] text-slate-500">{meta}</p>
          <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-2">{description}</p>
          <p className="text-[12px] text-slate-400">版本 {version}</p>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px]">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className={`mt-4 ${onDeletePermanent ? 'grid grid-cols-2 gap-2' : ''}`}>
        {isInstalled ? (
          <button
            type="button"
            onClick={onUninstall}
            className="w-full h-9 rounded-xl border border-slate-200 text-slate-700 text-[13px] font-medium flex items-center justify-center gap-1.5"
          >
            <Trash2 size={14} />
            {TEXT.uninstall}
          </button>
        ) : (
          <button
            type="button"
            onClick={onInstall}
            disabled={isBusy}
            className="w-full h-9 rounded-xl bg-[#1E64D8] text-white text-[13px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-70"
          >
            {isBusy ? <Download size={14} className="animate-pulse" /> : <Download size={14} />}
            {installLabel}
          </button>
        )}

        {onDeletePermanent && (
          <button
            type="button"
            onClick={onDeletePermanent}
            className="w-full h-9 rounded-xl border border-rose-200 text-rose-600 text-[13px] font-medium flex items-center justify-center gap-1.5 bg-rose-50/70"
          >
            <Trash2 size={14} />
            {TEXT.deletePermanent}
          </button>
        )}
      </div>

      {isInstalled && (
        <div className="mt-2 text-[12px] text-emerald-600 flex items-center gap-1">
          <CheckCircle2 size={14} />
          已安装
        </div>
      )}
    </article>
  );
};
