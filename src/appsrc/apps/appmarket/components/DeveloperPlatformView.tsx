import React, { useState } from 'react';
import { Upload } from 'lucide-react';

import { TEXT } from '../constants';
import type { CreateUploadedAppPayload, UploadedMarketApp } from '../types';

interface DeveloperPlatformViewProps {
  totalUploadedApps: number;
  onCreateApp: (payload: CreateUploadedAppPayload) => UploadedMarketApp;
}

interface DeveloperFormState {
  name: string;
  icon: string;
  version: string;
  description: string;
  html: string;
}

const INITIAL_FORM: DeveloperFormState = {
  name: '',
  icon: '📱',
  version: '1.0.0',
  description: '',
  html: '',
};

export const DeveloperPlatformView: React.FC<DeveloperPlatformViewProps> = ({
  totalUploadedApps,
  onCreateApp,
}) => {
  const [form, setForm] = useState<DeveloperFormState>(INITIAL_FORM);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChangeField = (field: keyof DeveloperFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleReadHtmlFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    setError(null);

    try {
      const html = await file.text();
      handleChangeField('html', html);
    } catch (readError) {
      console.error('Failed to read html file:', readError);
      setError(TEXT.readFileError);
    } finally {
      setIsReadingFile(false);
      event.target.value = '';
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!form.name.trim()) {
      setError(TEXT.createErrorName);
      return;
    }

    if (!form.html.trim()) {
      setError(TEXT.createErrorHtml);
      return;
    }

    const createdApp = onCreateApp({
      name: form.name,
      icon: form.icon,
      version: form.version,
      description: form.description,
      html: form.html,
    });

    setForm(INITIAL_FORM);
    setSuccessMessage(`${TEXT.createSuccess}：${createdApp.name}`);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-white border border-slate-100 p-4">
        <p className="text-[13px] text-slate-600 leading-relaxed">
          当前离线市场已收录
          <span className="font-semibold text-slate-900"> {totalUploadedApps} </span>
          个应用。你可以上传 HTML 并发布到离线市场。
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-3xl bg-white/90 border border-slate-100 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      >
        <label className="block space-y-1.5">
          <span className="text-[13px] text-slate-600">{TEXT.appName}</span>
          <input
            value={form.name}
            onChange={(event) => handleChangeField('name', event.target.value)}
            placeholder={TEXT.appNamePlaceholder}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-[13px] text-slate-600">{TEXT.appIcon}</span>
            <input
              value={form.icon}
              onChange={(event) => handleChangeField('icon', event.target.value)}
              placeholder={TEXT.appIconPlaceholder}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[13px] text-slate-600">{TEXT.appVersion}</span>
            <input
              value={form.version}
              onChange={(event) => handleChangeField('version', event.target.value)}
              placeholder={TEXT.appVersionPlaceholder}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[13px] text-slate-600">{TEXT.appDescription}</span>
          <input
            value={form.description}
            onChange={(event) => handleChangeField('description', event.target.value)}
            placeholder={TEXT.appDescriptionPlaceholder}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-slate-600">{TEXT.appHtmlLabel}</span>
            <label className="text-[12px] text-blue-600 flex items-center gap-1 cursor-pointer">
              <Upload size={14} />
              {isReadingFile ? '读取中...' : TEXT.uploadHtml}
              <input
                type="file"
                accept=".html,text/html"
                onChange={(event) => void handleReadHtmlFile(event)}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            value={form.html}
            onChange={(event) => handleChangeField('html', event.target.value)}
            placeholder={TEXT.appHtmlPlaceholder}
            rows={10}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-mono leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
          />
        </div>

        {error && (
          <p className="text-[12px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {successMessage && (
          <p className="text-[12px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          className="w-full h-10 rounded-xl bg-[#1E64D8] text-white text-[14px] font-medium"
        >
          {TEXT.submit}
        </button>
      </form>
    </section>
  );
};
