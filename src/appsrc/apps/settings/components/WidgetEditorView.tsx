import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { WidgetPlaceholder } from './WidgetPlaceholder';

const widgetTemplateCode: Record<string, string> = {
  'ins-photo': `export default function InsPhotoWidget({ system }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[22px] border border-white/35 bg-white/16 text-white backdrop-blur-xl">
      <div className="absolute inset-2 rounded-[18px] border border-white/35" />
      <div className="relative flex h-full items-center justify-center text-[12px] font-semibold">
        上传照片
      </div>
    </div>
  );
}`,
  'calendar-card': `export default function CalendarWidget({ system }) {
  return (
    <div className="h-full w-full rounded-[22px] border border-white/35 bg-white/16 p-3 font-serif italic text-white backdrop-blur-xl">
      <div className="text-right text-[24px] font-semibold">{system.date.monthName}</div>
      <div className="mt-2 text-[12px]">
        {system.date.year} 年 {system.date.month} 月 {system.date.day} 日
      </div>
      <div className="mt-1 text-[12px]">{system.date.weekday}</div>
    </div>
  );
}`,
  'vinyl-record': `export default function VinylWidget({ system }) {
  const track = system.music.currentTrack;
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[22px] border border-white/35 bg-white/16 text-white backdrop-blur-xl">
      <div className={\`h-[76%] aspect-square rounded-full bg-black shadow-xl \${system.music.isPlaying ? 'animate-[spin_3.8s_linear_infinite]' : ''}\`}>
        {track?.coverUrl ? <img src={track.coverUrl} className="h-full w-full rounded-full object-cover opacity-70" /> : null}
      </div>
      <div className="absolute inset-x-3 bottom-3 rounded-full bg-black/25 px-3 py-1 text-center text-[10px] backdrop-blur">
        <div className="truncate">{track?.title || '未播放音乐'}</div>
        <div className="truncate text-white/65">{track?.artist || '打开音乐播放歌曲'}</div>
      </div>
    </div>
  );
}`,
  'listen-together': `export default function ListenTogetherWidget({ system }) {
  return (
    <div className="h-full w-full rounded-[22px] border border-white/35 bg-white/16 p-3 text-slate-900 backdrop-blur-xl">
      <div className="text-[12px] text-slate-500">一起听歌</div>
      <div className="mt-2 text-[18px] font-bold">{system.music.currentTrack?.title || 'Only One'}</div>
      <div className="text-[13px] text-slate-500">{system.music.currentTrack?.artist || 'BoA'}</div>
      <button onClick={system.music.togglePlayback} className="mt-3 rounded-full bg-white/70 px-4 py-2 text-[13px] font-semibold">
        {system.music.isPlaying ? '暂停' : '播放'}
      </button>
    </div>
  );
}`,
  'clock-card': `export default function ClockWidget({ system }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-[18px] bg-zinc-400/60 text-white">
      <div className="text-[18px] font-semibold">{system.date.weekday}</div>
      <div className="text-[64px] font-black leading-none">{system.time.hhmm}</div>
    </div>
  );
}`,
  'text-card': `export default function TextCountdownWidget({ system }) {
  const target = new Date(system.date.year, 6, 30);
  const today = new Date(system.date.year, system.date.month - 1, system.date.day);
  const days = Math.floor(Math.abs(today.getTime() - target.getTime()) / 86400000);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center text-center text-white">
      <div className="font-serif text-[22px] italic">{days} 天</div>
      <div className="mt-2 text-[12px] text-white/85">我们的纪念日\\n2024.07.30</div>
    </div>
  );
}`,
  'custom-code': '',
};

export interface WidgetEditorViewProps {
  widgetId?: string;
  initialConfig?: {
    name: string;
    width: number;
    height: number;
    templateId?: string;
    widgetCode?: string;
    titleText?: string;
    subtitle?: string;
    titleColor?: string;
    titleFontSize?: number;
    musicTitle?: string;
    musicArtist?: string;
    cornerRadius: number;
    frosted: number;
    shadow: number;
  };
  onSave?: (config: {
    name: string;
    width: number;
    height: number;
    templateId?: string;
    widgetCode: string;
    cornerRadius: number;
    frosted: number;
    shadow: number;
  }) => void;
  onDelete?: () => void;
}

const templateNameMap: Record<string, string> = {
  'ins-photo': 'ins照片',
  'calendar-card': '日历',
  'vinyl-record': '唱片',
  'listen-together': '一起听歌',
  'clock-card': '时钟',
  'text-card': '文字',
  'custom-code': '自定义组件',
};

export const WidgetEditorView: React.FC<WidgetEditorViewProps> = ({ widgetId, initialConfig, onSave, onDelete }) => {
  const templateFromId = widgetId?.startsWith('template:') ? widgetId.slice('template:'.length) : undefined;
  const templateId = initialConfig?.templateId || templateFromId;
  const [widgetName, setWidgetName] = useState<string>(templateId ? templateNameMap[templateId] || '组件' : '自定义组件');
  const [gridW, setGridW] = useState<number>(initialConfig?.width || (templateId === 'clock-card' || templateId === 'listen-together' ? 4 : 2));
  const [gridH, setGridH] = useState<number>(initialConfig?.height || (templateId === 'clock-card' ? 1 : 2));
  const [gridWInput, setGridWInput] = useState<string>(String(initialConfig?.width || (templateId === 'clock-card' || templateId === 'listen-together' ? 4 : 2)));
  const [gridHInput, setGridHInput] = useState<string>(String(initialConfig?.height || (templateId === 'clock-card' ? 1 : 2)));
  const [cornerRadius, setCornerRadius] = useState<number>(initialConfig?.cornerRadius ?? 22);
  const [frosted, setFrosted] = useState<number>(initialConfig?.frosted ?? 8);
  const [shadow, setShadow] = useState<number>(initialConfig?.shadow ?? 12);
  const [widgetCode, setWidgetCode] = useState<string>(
    initialConfig?.widgetCode || (templateId ? widgetTemplateCode[templateId] : '') || ''
  );
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const isEditing = Boolean(initialConfig && !templateFromId);

  useEffect(() => {
    if (!initialConfig && !templateId) return;
    setWidgetName(initialConfig?.name || (templateId ? templateNameMap[templateId] : '') || '自定义组件');
    const nextGridW = initialConfig?.width || (templateId === 'clock-card' ? 4 : 2);
    const nextGridH = initialConfig?.height || (templateId === 'clock-card' ? 1 : 2);
    setGridW(nextGridW);
    setGridH(nextGridH);
    setGridWInput(String(nextGridW));
    setGridHInput(String(nextGridH));
    setCornerRadius(initialConfig?.cornerRadius ?? 22);
    setFrosted(initialConfig?.frosted ?? 8);
    setShadow(initialConfig?.shadow ?? 12);
    setWidgetCode(initialConfig?.widgetCode || (templateId ? widgetTemplateCode[templateId] : '') || '');
  }, [initialConfig, templateId]);

  const previewTemplateId = templateId || initialConfig?.templateId || 'custom-code';
  const canSave = widgetName.trim().length > 0 && widgetCode.trim().length > 0;
  const commitGridWInput = () => {
    const parsed = Number.parseInt(gridWInput, 10);
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 4) : gridW;
    setGridW(next);
    setGridWInput(String(next));
  };
  const commitGridHInput = () => {
    const parsed = Number.parseInt(gridHInput, 10);
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 6) : gridH;
    setGridH(next);
    setGridHInput(String(next));
  };

  return (
    <motion.div
      className="h-full flex flex-col bg-slate-50 text-slate-800"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.25)]">
          <div className="mb-3 text-xs text-slate-400">组件预览</div>
          <div className="mx-auto h-36 max-w-[280px] overflow-hidden rounded-2xl bg-slate-100">
            <WidgetPlaceholder
              name={widgetName.trim() || '组件'}
              status="normal"
              templateId={previewTemplateId}
              subtitle={initialConfig?.subtitle}
              titleText={initialConfig?.titleText}
              titleColor={initialConfig?.titleColor}
              titleFontSize={initialConfig?.titleFontSize}
              widgetCode={widgetCode}
              musicTitle={initialConfig?.musicTitle}
              musicArtist={initialConfig?.musicArtist}
              cornerRadius={cornerRadius}
              frosted={frosted}
              shadow={shadow}
              width={gridW}
              height={gridH}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">显示名称</label>
            <input
              type="text"
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">网格宽度</label>
              <input
                type="text"
                inputMode="numeric"
                value={gridWInput}
                onChange={(e) => {
                  const nextValue = e.target.value.replace(/[^\d]/g, '').slice(0, 2);
                  setGridWInput(nextValue);
                  const parsed = Number.parseInt(nextValue, 10);
                  if (Number.isFinite(parsed)) setGridW(Math.min(Math.max(parsed, 1), 4));
                }}
                onBlur={commitGridWInput}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">网格高度</label>
              <input
                type="text"
                inputMode="numeric"
                value={gridHInput}
                onChange={(e) => {
                  const nextValue = e.target.value.replace(/[^\d]/g, '').slice(0, 2);
                  setGridHInput(nextValue);
                  const parsed = Number.parseInt(nextValue, 10);
                  if (Number.isFinite(parsed)) setGridH(Math.min(Math.max(parsed, 1), 6));
                }}
                onBlur={commitGridHInput}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">组件代码 (支持原生HTML + CSS + JavaScript)</label>
            <textarea
              value={widgetCode}
              onChange={(event) => setWidgetCode(event.target.value)}
              className="min-h-[220px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-950 p-3 font-mono text-[12px] leading-5 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              spellCheck={false}
            />
          </div>

        </div>
      </div>

      <div className="px-5 pb-6">
        {isEditing && onDelete ? (
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="mb-3 w-full h-11 rounded-2xl border border-rose-200 bg-rose-50 font-semibold text-rose-600 transition-colors hover:bg-rose-100"
          >
            删除组件
          </button>
        ) : null}
        <button
          onClick={() => {
            if (!canSave) return;
            onSave?.({
              name: widgetName.trim() || '组件',
              width: gridW,
              height: gridH,
              templateId,
              widgetCode,
              cornerRadius,
              frosted,
              shadow,
            });
          }}
          disabled={!canSave}
          className={`w-full h-11 rounded-2xl font-semibold transition-colors ${
            canSave
              ? 'bg-sky-600 text-white hover:bg-sky-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isEditing ? '保存并更新' : '保存并添加'}
        </button>
      </div>
      {isDeleteConfirmOpen ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/28 px-6 backdrop-blur-sm">
          <div className="w-full max-w-[300px] rounded-3xl border border-white/70 bg-white/90 p-5 text-center shadow-[0_24px_60px_-30px_rgba(15,23,42,0.7)]">
            <div className="text-[16px] font-semibold text-slate-900">删除组件？</div>
            <div className="mt-2 text-[13px] leading-5 text-slate-500">删除后会从组件管理和桌面中移除，无法撤销。</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="h-10 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-600"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="h-10 rounded-2xl bg-rose-500 text-sm font-semibold text-white"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  onDelete?.();
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
};

export default WidgetEditorView;
