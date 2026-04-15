import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  UploadCloud,
  DownloadCloud,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useGlobalDesktopStore } from '@baobaobaiOS/sdk';

// ==================== 类型与接口定义 ====================

/**
 * 桌面布局管理页面 Props
 */
export interface DesktopLayoutViewProps {
  /** 点击编辑桌面布局回调 */
  onEditLayout?: (rows: number, cols: number) => void;
}

/**
 * 布局网格预设类型
 */
type GridPresetType = '4x6' | '5x6' | 'custom';

// ==================== 动画配置 ====================

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

// ==================== 主组件 ====================

/**
 * 桌面布局管理页面
 * 包含编辑入口、导入导出配置以及桌面网格行列数的调整
 */
export const DesktopLayoutView: React.FC<DesktopLayoutViewProps> = ({ onEditLayout }) => {
  const { desktopLayout, updateDesktopLayout } = useGlobalDesktopStore();

  // --- 状态管理 ---
  // 初始化时，从 store 读取当前行列数
  const [activeGrid, setActiveGrid] = useState<GridPresetType>(() => {
    if (desktopLayout.rows === 6 && desktopLayout.cols === 4) return '4x6';
    if (desktopLayout.rows === 6 && desktopLayout.cols === 5) return '5x6';
    return 'custom';
  });
  const [customRows, setCustomRows] = useState<number>(desktopLayout.rows || 6);
  const [customCols, setCustomCols] = useState<number>(desktopLayout.cols || 4);

  // --- 事件处理 ---
  const handleGridChange = (type: GridPresetType) => {
    setActiveGrid(type);
    let newRows = 6, newCols = 4;
    if (type === '4x6') {
      newRows = 6;
      newCols = 4;
      setCustomRows(6);
      setCustomCols(4);
    } else if (type === '5x6') {
      newRows = 6;
      newCols = 5;
      setCustomRows(6);
      setCustomCols(5);
    }
    // 更新 store 中的行列数
    updateDesktopLayout({ rows: newRows, cols: newCols });
  };

  const handleCustomInputChange = (type: 'row' | 'col', value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;

    setActiveGrid('custom');
    if (type === 'row') {
      const newRows = Math.min(Math.max(num, 4), 12);
      setCustomRows(newRows);
      updateDesktopLayout({ rows: newRows });
    }
    if (type === 'col') {
      const newCols = Math.min(Math.max(num, 3), 8);
      setCustomCols(newCols);
      updateDesktopLayout({ cols: newCols });
    }
  };

  // 获取当前行列数
  const getCurrentGrid = () => {
    if (activeGrid === '4x6') return { rows: 6, cols: 4 };
    if (activeGrid === '5x6') return { rows: 6, cols: 5 };
    return { rows: customRows, cols: customCols };
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <motion.main 
          className="px-4 pt-5 space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* 桌面网格布局 */}
          <motion.section variants={itemVariants} className="space-y-4 pt-2">
            
            <div className="bg-white rounded-[2rem] p-2 shadow-[0_4px_30px_-4px_rgba(0,0,0,0.03)] border border-slate-100 flex items-stretch">
              
              {/* 4x6 预设 */}
              <GridSelectorOption 
                active={activeGrid === '4x6'} 
                label="4×6" 
                onClick={() => handleGridChange('4x6')}
              >
                <GridVisualizer rows={6} cols={4} active={activeGrid === '4x6'} />
              </GridSelectorOption>

              {/* 5x6 预设 */}
              <GridSelectorOption 
                active={activeGrid === '5x6'} 
                label="5×6" 
                onClick={() => handleGridChange('5x6')}
              >
                <GridVisualizer rows={6} cols={5} active={activeGrid === '5x6'} />
              </GridSelectorOption>

              {/* 自定义区域 */}
              <div 
                className={`flex-1 flex flex-col justify-center px-4 py-4 rounded-[1.5rem] transition-all duration-300 border-2 ${
                  activeGrid === 'custom' ? 'border-sky-400 shadow-sm bg-sky-50/30' : 'border-transparent'
                }`}
                onClick={() => setActiveGrid('custom')}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">行</span>
                    <input 
                      type="number" 
                      value={customRows} 
                      onChange={(e) => handleCustomInputChange('row', e.target.value)}
                      className="w-14 h-8 bg-slate-100 rounded-lg text-center text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-200 transition-shadow"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">列</span>
                    <input 
                      type="number" 
                      value={customCols} 
                      onChange={(e) => handleCustomInputChange('col', e.target.value)}
                      className="w-14 h-8 bg-slate-100 rounded-lg text-center text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-200 transition-shadow"
                    />
                  </div>
                </div>
                <div className="text-center mt-3">
                  <span className={`text-[11px] font-bold tracking-widest ${activeGrid === "custom" ? "text-sky-500" : "text-slate-400"}`}>自定义</span>
                </div>
              </div>

            </div>
          </motion.section>

          {/* 操作卡片列表 */}
          <motion.section variants={itemVariants} className="space-y-3">
            <ActionCard
              icon={<LayoutDashboard size={24} />}
              title="编辑桌面布局"
              subtitle="设置图标，自由排列"
              iconBg="bg-purple-100 text-purple-500"
              onClick={() => {
                const grid = getCurrentGrid();
                onEditLayout?.(grid.rows, grid.cols);
              }}
            />
            <ActionCard
              icon={<UploadCloud size={24} />}
              title="导出布局配置"
              subtitle="生成备份代码分享给他人"
              iconBg="bg-sky-100 text-sky-500"
            />
            <ActionCard
              icon={<DownloadCloud size={24} />}
              title="导入布局配置"
              subtitle="读取 Base64 代码恢复布局"
              iconBg="bg-emerald-100 text-emerald-500"
            />
          </motion.section>

          {/* 提示信息 */}
          <motion.div variants={itemVariants} className="flex items-start gap-2 px-2 text-slate-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              布局管理允许你保存当前的图标排列和所有自定义组件。导入时会完全覆盖当前的桌面设置，请谨慎操作。
            </p>
          </motion.div>

        </motion.main>
      </motion.div>
    </AnimatePresence>
  );
};

// ==================== 子组件 ====================

/**
 * 操作列表卡片组件
 */
interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  iconBg: string;
  onClick?: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, subtitle, iconBg, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center p-4 bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-md active:scale-[0.98] transition-all group"
  >
    <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-transform group-hover:scale-105 ${iconBg}`}>
      {icon}
    </div>
    <div className="ml-4 flex-1 text-left flex flex-col justify-center">
      <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
    <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
  </button>
);

/**
 * 预设网格选项包裹容器
 */
interface GridSelectorOptionProps {
  active: boolean;
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}

const GridSelectorOption: React.FC<GridSelectorOptionProps> = ({ active, label, children, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center py-5 rounded-[1.5rem] transition-all duration-300 border-2 relative ${
      active ? 'border-sky-400 shadow-sm bg-sky-50/30' : 'border-transparent hover:bg-slate-50'
    }`}
  >
    <div className="h-16 flex items-center justify-center mb-3">
      {children}
    </div>
    <span className={`text-[13px] font-bold ${active ? 'text-sky-500' : 'text-slate-500'}`}>
      {label}
    </span>
    {/* 选项分隔线，仅在非激活时隐约显示 */}
    {!active && <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-slate-100" />}
  </button>
);

/**
 * 微型桌面网格渲染器（用来动态绘制手机网格的图标占位）
 */
interface GridVisualizerProps {
  rows: number;
  cols: number;
  active: boolean;
}

const GridVisualizer: React.FC<GridVisualizerProps> = ({ rows, cols, active }) => {
  // 限制最大渲染数防止崩溃
  const renderRows = Math.min(rows, 8);
  const renderCols = Math.min(cols, 6);

  return (
    <div 
      className={`p-1.5 rounded-lg border-2 ${active ? 'border-sky-400 bg-white' : 'border-slate-300 bg-slate-50'}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${renderCols}, 1fr)`,
        gridTemplateRows: `repeat(${renderRows}, 1fr)`,
        gap: '3px',
        width: '38px', // 设定一个固定的视觉宽度
        height: '56px' // 设定固定高度，模拟手机比例
      }}
    >
      {Array.from({ length: renderRows * renderCols }).map((_, i) => (
        <div 
          key={i} 
          className={`rounded-[2px] ${active ? 'bg-sky-400' : 'bg-slate-300'}`} 
        />
      ))}
    </div>
  );
};

export default DesktopLayoutView;
