import React, { useRef } from "react";
import { motion } from "motion/react";
import {
  ChevronLeft,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { useGlobalSettingsStore } from "@baobaobaiOS/sdk";

// ==================== 类型定义 ====================

/**
 * 主题管理页面 Props
 */
export interface ThemeManageViewProps {
  /** 点击返回按钮的回调 */
  onBack: () => void;
}

// ==================== 动画配置 ====================

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

// ==================== 主组件 ====================

/**
 * 主题管理界面组件
 * 包含更换壁纸功能
 */
export const ThemeManageView: React.FC<ThemeManageViewProps> = ({
  onBack,
}) => {
  const { settings, updateSettings } = useGlobalSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理壁纸选择
  const handleWallpaperSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('请选择 JPG、PNG 或 WebP 格式的图片');
        return;
      }

      // 读取文件为 Base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        updateSettings({ wallpaper: result });
      };
      reader.readAsDataURL(file);
    }
  };

  // 触发文件选择
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 删除壁纸
  const handleRemoveWallpaper = () => {
    updateSettings({ wallpaper: null });
  };

  // 透明度滑块组件
  const OpacitySlider: React.FC<{ value: number; onChange: (val: number) => void }> = ({ value, onChange }) => (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="text-[15px] font-medium text-slate-700">壁纸透明度</span>
        <span className="text-sm font-semibold text-slate-400">{value}%</span>
      </div>
      {/* 预览区域 */}
      <div className="relative rounded-2xl overflow-hidden h-24 bg-gradient-to-br from-slate-800 to-slate-900">
        {settings.wallpaper ? (
          <img
            src={settings.wallpaper}
            alt="壁纸预览"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: value / 100 }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            <span className="text-sm">暂无壁纸</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-white text-xs font-medium">预览</span>
          </div>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-400"
      />
    </div>
  );

  return (
    <motion.div
      className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 font-sans"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleWallpaperSelect}
        className="hidden"
      />

      {/* 主体内容滚动区 */}
      <motion.main
        className="px-5 pb-12 pt-4 space-y-8 min-h-full"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* 当前壁纸预览 */}
        {settings.wallpaper && (
          <motion.section variants={itemVariants} className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 tracking-widest pl-2">
              当前壁纸
            </h2>
            <div className="relative rounded-3xl overflow-hidden shadow-lg">
              <img
                src={settings.wallpaper}
                alt="当前壁纸"
                className="w-full h-48 object-cover"
              />
              <button
                onClick={handleRemoveWallpaper}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft size={16} className="rotate-45" />
              </button>
            </div>
          </motion.section>
        )}

        {/* 更换壁纸 */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 tracking-widest pl-2">
            更换壁纸
          </h2>

          <button
            onClick={triggerFileSelect}
            className="w-full flex items-center p-5 bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow group"
          >
            <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500 group-hover:bg-sky-100 transition-colors">
              {settings.wallpaper ? <Check size={28} /> : <ImageIcon size={28} />}
            </div>
            <div className="ml-4 flex-1 text-left">
              <h3 className="text-base font-semibold text-slate-800">
                {settings.wallpaper ? "更换壁纸" : "选择壁纸"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                支持 JPG / PNG / WebP
              </p>
            </div>
            <ChevronLeft size={20} className="text-slate-300 rotate-180" />
          </button>

          {/* 壁纸透明度设置 */}
          <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
            <OpacitySlider
              value={settings.wallpaperOpacity}
              onChange={(val) => updateSettings({ wallpaperOpacity: val })}
            />
          </div>
        </motion.section>
      </motion.main>
    </motion.div>
  );
};

export default ThemeManageView;
