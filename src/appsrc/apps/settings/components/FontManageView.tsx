import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Trash2, Check, Type } from 'lucide-react';
import { useSettingsStore } from '../store';

// ==================== 类型定义 ====================

export interface FontManageViewProps {
  onBack?: () => void;
}

// ==================== 常量 ====================

const DEFAULT_STACK = '"Inter", ui-sans-serif, system-ui, sans-serif';

const FONT_PRESETS = [
  {
    id: 'system',
    name: '系统默认',
    stack: DEFAULT_STACK,
    sample: '系统默认 ABC 你好',
  },
  {
    id: 'china',
    name: '中文优先',
    stack: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
    sample: '中文优先 ABC 你好',
  },
  {
    id: 'rounded',
    name: '圆润风格',
    stack: '"MiSans", "HarmonyOS Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
    sample: '圆润风格 ABC 你好',
  },
  {
    id: 'handwriting',
    name: '手写字体',
    stack: '"NaniFont Light", "PingFang SC", "Microsoft YaHei", sans-serif',
    sample: '手写字体 ABC 你好',
  },
  {
    id: 'mono',
    name: '等宽字体',
    stack: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
    sample: 'Monospace 012345',
  }
];

const getFontFormat = (file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'woff2':
      return 'woff2';
    case 'woff':
      return 'woff';
    case 'otf':
      return 'opentype';
    case 'ttf':
      return 'truetype';
    default:
      return 'truetype';
  }
};

const normalizeFontName = (fileName: string) => {
  return fileName.replace(/\.[^.]+$/, '') || 'CustomFont';
};

// ==================== 主组件 ====================

export const FontManageView: React.FC<FontManageViewProps> = () => {
  const { settings, updateSettings } = useSettingsStore();

  const isPresetActive = (stack: string) => settings.fontFamily === stack;
  const hasCustomFont = Boolean(settings.customFontData && settings.customFontName);
  const isCustomActive = hasCustomFont && settings.fontFamily?.includes(settings.customFontName || '');

  const applyFontFamily = (stack: string) => {
    updateSettings({ fontFamily: stack });
  };

  const handleImportFont = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      const fontName = normalizeFontName(file.name);
      const fontFormat = getFontFormat(file);
      updateSettings({
        customFontData: result,
        customFontName: fontName,
        customFontFormat: fontFormat,
        fontFamily: `"${fontName}", ${DEFAULT_STACK}`,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomFont = () => {
    updateSettings({
      customFontData: null,
      customFontName: null,
      customFontFormat: null,
      fontFamily: DEFAULT_STACK,
    });
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 font-sans pb-16"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <motion.main
          className="px-5 pt-5 space-y-6"
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        >
          <motion.section
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] overflow-hidden"
          >
            <div className="px-5 pt-4 pb-2 text-xs text-slate-400 uppercase tracking-widest">
              系统预设字体
            </div>
            <div className="divide-y divide-slate-100">
              {FONT_PRESETS.map((preset) => {
                const active = isPresetActive(preset.stack);
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyFontFamily(preset.stack)}
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
                      {active ? <Check size={18} /> : <Type size={18} />}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-[15px] font-semibold text-slate-800">{preset.name}</div>
                      <div className="text-xs text-slate-500 mt-1" style={{ fontFamily: preset.stack }}>
                        {preset.sample}
                      </div>
                    </div>
                    {active && <span className="text-xs text-sky-500 font-semibold">已启用</span>}
                  </button>
                );
              })}
            </div>
          </motion.section>

          <motion.section
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] overflow-hidden"
          >
            <div className="px-5 pt-4 pb-2 text-xs text-slate-400 uppercase tracking-widest">
              导入字体
            </div>
            <div className="px-5 pb-5 space-y-4">
              <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
                <Upload size={16} />
                选择字体文件（ttf/otf/woff/woff2）
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  className="hidden"
                  onChange={(e) => handleImportFont(e.target.files?.[0] || null)}
                />
              </label>

              {hasCustomFont ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{settings.customFontName}</div>
                      <div className="text-xs text-slate-500 mt-1">已导入字体</div>
                    </div>
                    {isCustomActive ? (
                      <span className="text-xs text-emerald-500 font-semibold">使用中</span>
                    ) : (
                      <button
                        onClick={() => applyFontFamily(`"${settings.customFontName}", ${DEFAULT_STACK}`)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/70 hover:bg-emerald-100"
                      >
                        使用
                      </button>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-slate-500" style={{ fontFamily: `"${settings.customFontName}", ${DEFAULT_STACK}` }}>
                    自定义字体预览 ABC 你好 123
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      onClick={handleRemoveCustomFont}
                      className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                      移除字体
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">未导入字体时，将使用系统预设字体。</div>
              )}
            </div>
          </motion.section>
        </motion.main>
      </motion.div>
    </AnimatePresence>
  );
};

export default FontManageView;
