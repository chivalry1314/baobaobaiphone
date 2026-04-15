// WidgetManageView.tsx
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon } from 'lucide-react';
import { useGlobalDesktopStore } from '@baobaobaiOS/sdk';

// ==================== 类型定义 ====================

export interface WidgetManageViewProps {
  onNavigateToEditor: (widgetId?: string) => void;
}

interface WidgetItem {
  id: string;
  name: string;
  type: string;
  size: string;
  isPro?: boolean;
  previewIcon: React.ReactNode;
  previewImage?: string;
  previewTitle: string;
  previewValue: string;
}

// ==================== 动画配置 ====================

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

// ==================== 主组件 ====================

export const WidgetManageView: React.FC<WidgetManageViewProps> = ({ onNavigateToEditor }) => {
  const { desktopLayout } = useGlobalDesktopStore();
  const customWidgets = (desktopLayout.items || []).filter(
    (item) => item.type === 'widget' && item.componentId === 'custom-widget'
  );

  const customWidgetItems: WidgetItem[] = customWidgets.map((item) => ({
    id: item.instanceId,
    name: item.data?.name || '自定义组件',
    type: 'CUSTOM',
    size: `${item.w || 2}x${item.h || 2}`,
    previewImage: item.data?.backgroundImage || item.data?.placeholderIcon || '',
    previewIcon: (item.data?.backgroundImage || item.data?.placeholderIcon) ? (
      <img
        src={item.data?.backgroundImage || item.data?.placeholderIcon}
        alt={item.data?.name || '自定义组件'}
        className="w-7 h-7 object-cover rounded-md"
      />
    ) : (
      <ImageIcon size={28} className="text-slate-400" />
    ),
    previewTitle: item.data?.name || '自定义组件',
    previewValue: ''
  }));

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,#eef2ff_0%,#f8fafc_38%,#f8fafc_100%)] text-slate-800 font-sans pb-16"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <motion.header
          className="px-5 pt-6 pb-3"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={itemVariants}
            className="rounded-[1.75rem] border border-white/60 bg-white/70 backdrop-blur shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] p-5"
          >
            <div className="text-[11px] text-slate-400 uppercase tracking-[0.3em]">组件工坊</div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold text-slate-800">我的组件</div>
                <div className="text-xs text-slate-500 mt-1">集中管理你的自定义组件</div>
              </div>
              <div className="text-xs text-slate-500 bg-slate-100/80 rounded-full px-2.5 py-1">
                {customWidgetItems.length} 个
            </div>
            </div>
          </motion.div>
        </motion.header>

        <motion.main 
          className="px-5 grid grid-cols-2 gap-4 pb-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {customWidgetItems.length === 0 && (
            <motion.div
              variants={itemVariants}
              className="col-span-2 rounded-[1.75rem] border border-dashed border-slate-200 bg-white/70 p-8 text-center text-slate-500"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <ImageIcon size={22} className="text-slate-400" />
              </div>
              <div className="text-sm font-medium">还没有自定义组件</div>
              <div className="text-xs text-slate-400 mt-1">去编辑器里创建你的第一个组件</div>
            </motion.div>
          )}
          {customWidgetItems.map((widget) => (
            <motion.div 
              key={widget.id} 
              variants={itemVariants}
              className="group relative rounded-[1.75rem] bg-white/80 border border-white/60 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.6)] overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_26px_45px_-30px_rgba(15,23,42,0.7)]"
              onClick={() => onNavigateToEditor(widget.id)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-transparent pointer-events-none" />
              <div className="p-4 pb-3">
                <div className="relative rounded-2xl overflow-hidden h-28 bg-slate-100/80 border border-slate-100">
                  {widget.previewImage ? (
                    <img src={widget.previewImage} alt={widget.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      {widget.previewIcon}
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 tracking-widest">{widget.type}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-100/80 rounded-full px-2 py-0.5">{widget.size}</span>
                  </div>
                  <div className="mt-1 text-[15px] font-semibold text-slate-800 truncate">{widget.name}</div>
                  <div className="text-xs text-slate-500 truncate">{widget.previewTitle}</div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 pb-4">
                <div className="text-[11px] text-slate-400">点击编辑</div>
              </div>
            </motion.div>
          ))}
        </motion.main>
      </motion.div>
    </AnimatePresence>
  );
};

export default WidgetManageView;
