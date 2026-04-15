import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  Smile,
  LayoutTemplate,
  Settings2,
  Palette,
  Type,
  CloudUpload,
  CloudDownload,
  Sparkles,
} from "lucide-react";

// ==================== 类型定义 ====================

/**
 * 美化设置页面 Props
 * 注意：导航栏由父组件 SettingsApp 提供
 */
export interface BeautifySettingsProps {
  /** 点击主题管理按钮的回调 */
  onNavigateToThemeManage?: () => void;
  /** 点击图标管理按钮的回调 */
  onNavigateToIconManage?: () => void;
  /** 点击组件管理按钮的回调 */
  onNavigateToWidgetManage?: () => void;
  /** 点击布局按钮的回调 */
  onNavigateToLayout?: () => void;
  /** 点击字体按钮的回调 */
  onNavigateToFontManage?: () => void;
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
 * 美化设置界面组件
 * 采用清新透气的卡片式设计，支持主题、壁纸、字体等个性化配置
 * 注意：导航栏由父组件 SettingsApp 提供
 */
export const BeautifyView: React.FC<BeautifySettingsProps> = ({
  onNavigateToThemeManage,
  onNavigateToIconManage,
  onNavigateToWidgetManage,
  onNavigateToLayout,
  onNavigateToFontManage,
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 font-sans"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {/* 主体内容滚动区 */}
        <motion.main
          className="px-5 pb-12 pt-4 space-y-8 min-h-full"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* 模块：通用设置项 (聚合卡片) */}
          <motion.section
            variants={itemVariants}
            className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden"
          >
            <div className="flex flex-col">
              <SettingRow
                icon={<Sparkles />}
                title="主题"
                value=""
                onClick={onNavigateToThemeManage}
              />
              <SettingRow
                icon={<Smile />}
                title="图标"
                value=""
                onClick={onNavigateToIconManage}
              />
              <SettingRow icon={<Settings2 />} title="布局" onClick={onNavigateToLayout} />
              <SettingRow
                icon={<LayoutTemplate />}
                title="组件"
                value=""
                onClick={onNavigateToWidgetManage}
              />
              <SettingRow
                icon={<Type />}
                title="字体"
                value=""
                hasBorder={false}
                onClick={onNavigateToFontManage}
              />
            </div>
          </motion.section>

          {/* 模块 3：备份与恢复 */}
          <motion.section variants={itemVariants} className="space-y-4 mt-2">
            <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
              <SettingRow
                icon={<CloudUpload />}
                title="导出配置"
                iconColor="text-slate-500"
              />
              <SettingRow
                icon={<CloudDownload />}
                title="导入配置"
                iconColor="text-sky-500"
                hasBorder={false}
              />
            </div>
          </motion.section>
        </motion.main>
      </motion.div>
    </AnimatePresence>
  );
};

// ==================== 子组件 ====================

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  hasBorder?: boolean;
  iconColor?: string;
  onClick?: () => void;
}

/**
 * 设置列表单行组件
 */
const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  title,
  subtitle,
  value,
  hasBorder = true,
  iconColor = "text-slate-400",
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center p-5 bg-white hover:bg-slate-50 transition-colors ${hasBorder ? "border-b border-slate-100" : ""}`}
    >
      <div className={`${iconColor} mr-4`}>
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 22 })
          : icon}
      </div>
      <div className="flex-1 text-left flex items-baseline gap-2">
        <span className="text-[15px] font-medium text-slate-700">{title}</span>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
      {value && <span className="text-sm text-slate-400 mr-2">{value}</span>}
      <ChevronLeft size={18} className="text-slate-300 rotate-180" />
    </button>
  );
};

export default BeautifyView;
