import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Widget } from '../../../../components/Widget';

export interface WidgetEditorViewProps {
  widgetId?: string;
  initialConfig?: {
    name: string;
    width: number;
    height: number;
    backgroundImage: string;
    cornerRadius: number;
    frosted: number;
    shadow: number;
  };
  onSave?: (config: {
    name: string;
    width: number;
    height: number;
    backgroundImage: string;
    cornerRadius: number;
    frosted: number;
    shadow: number;
  }) => void;
}

export const WidgetEditorView: React.FC<WidgetEditorViewProps> = ({ initialConfig, onSave }) => {
  const [widgetName, setWidgetName] = useState<string>('自定义组件');
  const [gridW, setGridW] = useState<number>(2);
  const [gridH, setGridH] = useState<number>(2);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [cornerRadius, setCornerRadius] = useState<number>(24);
  const [frosted, setFrosted] = useState<number>(8);
  const [shadow, setShadow] = useState<number>(12);
  const isEditing = Boolean(initialConfig);

  useEffect(() => {
    if (!initialConfig) return;
    setWidgetName(initialConfig.name || '自定义组件');
    setGridW(initialConfig.width || 2);
    setGridH(initialConfig.height || 2);
    setBackgroundImage(initialConfig.backgroundImage || '');
    setCornerRadius(initialConfig.cornerRadius ?? 24);
    setFrosted(initialConfig.frosted ?? 8);
    setShadow(initialConfig.shadow ?? 12);
  }, [initialConfig]);

  const previewSize: 'small' | 'medium' | 'large' = 'medium';
  const previewShadow = shadow > 0
    ? `0 ${Math.max(2, Math.round(shadow / 2))}px ${shadow}px -${Math.max(2, Math.round(shadow / 3))}px rgba(15, 23, 42, 0.35)`
    : 'none';
  const frostedOpacity = Math.min(0.6, frosted / 40);

  const handleUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setBackgroundImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const canSave = widgetName.trim().length > 0 && backgroundImage.length > 0;

  return (
    <motion.div
      className="h-full flex flex-col bg-slate-50 text-slate-800"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.25)]">
          <div className="text-xs text-slate-400 mb-4">组件预览</div>
          <div className="flex items-center justify-center">
            <Widget
              title={widgetName.trim() || '自定义组件'}
              size={previewSize}
              className="relative overflow-hidden p-0"
              style={{ borderRadius: cornerRadius, boxShadow: previewShadow }}
            >
              <div className="relative w-full h-full">
                {backgroundImage ? (
                  <img src={backgroundImage} alt="background" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-200/70 flex items-center justify-center">
                      <ImageIcon size={22} className="text-slate-400" />
                    </div>
                  </div>
                )}
                {frosted > 0 && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backdropFilter: `blur(${frosted}px)`,
                      WebkitBackdropFilter: `blur(${frosted}px)`,
                      backgroundColor: `rgba(255, 255, 255, ${frostedOpacity})`,
                    }}
                  />
                )}
              </div>
            </Widget>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">显示名称</label>
            <input
              type="text"
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              placeholder="请输入组件名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">网格宽度</label>
              <input
                type="number"
                min={1}
                max={4}
                value={gridW}
                onChange={(e) => setGridW(Math.min(Math.max(parseInt(e.target.value || '1', 10), 1), 4))}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">网格高度</label>
              <input
                type="number"
                min={1}
                max={6}
                value={gridH}
                onChange={(e) => setGridH(Math.min(Math.max(parseInt(e.target.value || '1', 10), 1), 6))}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">背景图（必填）</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
              <Upload size={16} />
              上传图片
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files?.[0] || null)}
              />
            </label>
            {backgroundImage ? (
              <div className="mt-3 flex items-center gap-3">
                <img src={backgroundImage} alt="background preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                <button
                  onClick={() => setBackgroundImage('')}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  移除
                </button>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-rose-500">请上传背景图后再保存</div>
            )}
          </div>

          <div className="pt-2 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">圆角大小</label>
                <span className="text-xs text-slate-500">{cornerRadius}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={32}
                value={cornerRadius}
                onChange={(e) => setCornerRadius(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">磨砂程度</label>
                <span className="text-xs text-slate-500">{frosted}</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={frosted}
                onChange={(e) => setFrosted(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">阴影大小</label>
                <span className="text-xs text-slate-500">{shadow}</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                value={shadow}
                onChange={(e) => setShadow(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-6">
        <button
          onClick={() => {
            if (!canSave) return;
            onSave?.({
              name: widgetName.trim() || '自定义组件',
              width: gridW,
              height: gridH,
              backgroundImage,
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
    </motion.div>
  );
};

export default WidgetEditorView;
