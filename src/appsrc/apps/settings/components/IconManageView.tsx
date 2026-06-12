import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  RotateCcw,
  Smartphone,
  Share,
  Trash2
} from 'lucide-react';
import { localApps } from '../../../../core/registry';
import { useGlobalSettingsStore } from '@baobaobaiOS/sdk';
import { useInstalledAppIds } from '../../appmarket/selectors';
import * as LucideIcons from 'lucide-react';

// ==================== 类型与接口定义 ====================

/**
 * 自定义图标设置页面属性
 */
export interface IconManageViewProps {}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

const dockIconItems = [
  { id: 'phone', name: 'Phone', icon: 'Phone', sourceLabel: '桌面 Dock' },
  { id: 'safari', name: 'Safari', icon: 'Compass', sourceLabel: '桌面 Dock' },
  { id: 'messages', name: 'Messages', icon: 'MessageCircle', sourceLabel: '桌面 Dock' },
  { id: 'camera', name: 'Camera', icon: 'Camera', sourceLabel: '桌面 Dock' },
];

// ==================== 主组件 ====================

/**
 * 自定义图标设置页面
 * 支持全局图标样式调整与独立图标替换，包含实时预览功能
 */
export const IconManageView: React.FC<IconManageViewProps> = () => {
  const { settings, updateSettings } = useGlobalSettingsStore();
  const installedAppIds = useInstalledAppIds();

  const manageableApps = useMemo(() => {
    const appItems = localApps
      .filter((app) => app.isSystem || installedAppIds.includes(app.id))
      .map((app) => ({
        id: app.id,
        name: app.name,
        icon: app.icon,
        sourceLabel: app.isSystem ? '系统应用' : '已安装应用',
      }));
    const existingIds = new Set(appItems.map((item) => item.id));
    return [
      ...dockIconItems.filter((item) => !existingIds.has(item.id)),
      ...appItems,
    ];
  }, [installedAppIds]);

  // 文件上传引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAppId, setUploadingAppId] = useState<string | null>(null);

  // 获取图标组件的辅助函数
  const getIconComponent = (iconName: string): React.ElementType => {
    return (LucideIcons as unknown as Record<string, React.ElementType>)[iconName] || Smartphone;
  };

  // 触发文件上传
  const triggerUpload = (appId: string) => {
    setUploadingAppId(appId);
    fileInputRef.current?.click();
  };

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && uploadingAppId) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        alert('请选择 JPG、PNG、WebP 或 SVG 格式的图片');
        setUploadingAppId(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const newCustomIcons = {
          ...settings.customIcons,
          [uploadingAppId]: result
        };
        updateSettings({ customIcons: newCustomIcons });
        setUploadingAppId(null);
      };
      reader.readAsDataURL(file);
    }
    // 清空输入值，允许重复选择同一文件
    event.target.value = '';
  };

  // 删除自定义图标
  const handleDeleteIcon = (appId: string) => {
    const newCustomIcons = { ...settings.customIcons };
    delete newCustomIcons[appId];
    updateSettings({ customIcons: newCustomIcons });
  };

  // --- 事件处理 ---
  const handleReset = () => {
    updateSettings({
      iconSize: 60,
      iconRadius: 18,
      iconFrosted: 10,
      iconShadow: 8,
      showAppName: true
    });
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 font-sans"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {/* 顶部操作按钮 */}
        <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-xl pt-3 px-4 pb-2 border-b border-slate-200/50">
          <div className="flex items-center justify-end">
            <button onClick={handleReset} className="flex items-center justify-center gap-1.5 py-2.5 px-5 rounded-full bg-rose-50 border border-rose-100 text-sm font-medium text-rose-500 hover:bg-rose-100 active:scale-95 transition-all shadow-sm">
              <RotateCcw size={16} /> 重置所有
            </button>
          </div>
        </div>

        <motion.main 
          className="px-4 pt-5 space-y-6 pb-12"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* 2. 实时预览区域 */}
          <motion.section variants={itemVariants} className="relative flex flex-col items-center justify-center py-10 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-[2rem] shadow-[0_4px_30px_-4px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
            
            {/* ====== 背景装饰图形（用于凸显磨砂玻璃效果） ====== */}
            <div className="absolute top-6 left-1/4 w-16 h-16 bg-yellow-300 rounded-full opacity-60 mix-blend-overlay" />
            <div className="absolute bottom-6 right-1/4 w-20 h-20 bg-cyan-300 rounded-xl rotate-12 opacity-60 mix-blend-overlay" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/20 rounded-full blur-xl" />

            <h2 className="relative z-10 text-[11px] font-bold text-white/90 tracking-[0.2em] mb-8 uppercase drop-shadow-sm">
              预览
            </h2>
            <div className="relative z-10 flex flex-col items-center justify-center h-[120px]">
              
              {/* ====== 动态变化的预览图标 ====== */}
              <div
                className="flex items-center justify-center transition-all duration-200 ease-out border border-white/50"
                style={{
                  width: `${settings.iconSize}px`,
                  height: `${settings.iconSize}px`,
                  borderRadius: `${settings.iconRadius}px`,
                  // 1. 降低背景不透明度，让底层图案能够透出。
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  // 2. 应用磨砂模糊效果，并保持标准与兼容属性一致。
                  backdropFilter: settings.iconFrosted > 0 ? `blur(${settings.iconFrosted}px)` : 'none',
                  WebkitBackdropFilter: settings.iconFrosted > 0 ? `blur(${settings.iconFrosted}px)` : 'none',
                  boxShadow: `0 ${settings.iconShadow}px ${settings.iconShadow * 2}px rgba(0,0,0,0.15)`
                }}
              >
                <Smartphone size={settings.iconSize * 0.4} className="text-black drop-shadow-sm" strokeWidth={1.5} />
              </div>

              <AnimatePresence>
                {settings.showAppName && (
                  <motion.span 
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="text-xs text-black font-medium mt-3 drop-shadow-md"
                  >
                    应用名称
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* 3. 全局图标样式设置 */}
          <motion.section variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2 pl-2">
              <Share size={18} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">全局图标样式</h3>
            </div>
            
            <div className="bg-white rounded-[2rem] p-5 shadow-[0_4px_30px_-4px_rgba(0,0,0,0.03)] border border-slate-100 space-y-6">
              <SliderRow label="图标大小 (Size)" value={settings.iconSize} suffix="px" min={40} max={80} onChange={(val) => updateSettings({ iconSize: val })} />
              <SliderRow label="圆角大小 (Radius)" value={settings.iconRadius} suffix="px" min={0} max={40} onChange={(val) => updateSettings({ iconRadius: val })} />
              <SliderRow label="磨砂程度 (Frosted)" value={settings.iconFrosted} suffix="px" min={0} max={20} onChange={(val) => updateSettings({ iconFrosted: val })} />
              <SliderRow label="阴影大小 (Shadow)" value={settings.iconShadow} suffix="px" min={0} max={20} onChange={(val) => updateSettings({ iconShadow: val })} />

              <hr className="border-slate-100" />

              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col">
                  <span className="text-[15px] font-medium text-slate-700">显示应用名称</span>
                  <span className="text-xs text-slate-400 mt-0.5">在图标下方显示文本</span>
                </div>
                <button
                  onClick={() => updateSettings({ showAppName: !settings.showAppName })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ease-in-out ${settings.showAppName ? 'bg-emerald-400' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-300 ease-in-out ${settings.showAppName ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </motion.section>

          {/* 4. 独立图标替换列表 */}
          <motion.section variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2 pl-2">
              <LayoutGridIcon size={18} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">独立图标替换</h3>
            </div>

            <div className="bg-white rounded-[2rem] shadow-[0_4px_30px_-4px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
              {manageableApps.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  No manageable apps yet. Install apps from App Market first.
                </div>
              ) : manageableApps.map((app, index) => {
                const IconComponent = getIconComponent(app.icon);
                const customIcon = settings.customIcons?.[app.id];
                return (
                  <div key={app.id} className={`flex items-center justify-between p-4 ${index !== manageableApps.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-black bg-white overflow-hidden"
                      >
                        {customIcon ? (
                          <img src={customIcon} alt={app.name} className="w-full h-full object-cover" />
                        ) : (
                          <IconComponent size={22} strokeWidth={1.5} className="text-black" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-medium text-slate-700">{app.name}</span>
                        <span className="text-xs text-slate-400 mt-0.5">
                          {app.sourceLabel} · {customIcon ? '自定义图标' : app.icon}
                        </span>
                      </div>
                    </div>

                    {customIcon ? (
                      <button
                        onClick={() => handleDeleteIcon(app.id)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => triggerUpload(app.id)}
                        className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-sky-500 transition-colors active:scale-95"
                      >
                        <Upload size={20} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* 隐藏的文件上传输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleFileUpload}
            className="hidden"
          />
        </motion.main>
      </motion.div>
    </AnimatePresence>
  );
};

// ==================== 子组件 ====================

interface SliderRowProps {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, suffix, min, max, onChange }) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="text-[15px] font-medium text-slate-700">{label}</span>
        <span className="text-sm font-semibold text-slate-400">{value}{suffix}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-400"
      />
    </div>
  );
};

const LayoutGridIcon: React.FC<{size?: number, className?: string}> = ({ size=24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

export default IconManageView;

