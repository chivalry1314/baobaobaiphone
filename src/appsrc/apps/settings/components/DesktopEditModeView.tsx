import React, { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalDesktopStore } from '@baobaobaiOS/sdk';
import type { DesktopItem } from '@baobaobaiOS/sdk';
import { localApps } from '../../../../core/registry';
import { useAppMarketInstallSnapshot } from '../../appmarket/selectors';
import { getInstalledRuntimeMarketApps } from '../../appmarket/runtime';
import { getAllWidgets } from '../../../../core/widgetRegistry';
import { isSystemAppId } from '../../../../core/systemApps';
import { Plus, LayoutGrid, Sparkles, ChevronLeft, ChevronRight, AlertTriangle, Trash2, Check } from 'lucide-react';

// ==================== 类型定义 ====================

export interface DesktopEditModeViewProps {
  rows: number;
  cols: number;
  onSave?: () => void;
  onNavigateToWidgetEditor?: (widgetId?: string) => void;
}

// 编辑模式类型
type EditMode = 'icon' | 'widget';

interface EditableAppItem {
  id: string;
  name: string;
  color?: string;
  runtimeIcon?: string;
}

// ==================== 动画配置 ====================

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

// ==================== 主组件====================

/**
 * 桌面编辑模式页面
 * 提供所见即所得的桌面组件与图标的拖拽、排列预览功能
 */
export const DesktopEditModeView: React.FC<DesktopEditModeViewProps> = ({ rows, cols, onNavigateToWidgetEditor }) => {
  const { desktopLayout, addDesktopItem, updateDesktopItem, removeDesktopItem, updateDesktopLayout } = useGlobalDesktopStore();
  const { installedAppIds, uploadedApps } = useAppMarketInstallSnapshot();

  // 状态管理
  const [activePage, setActivePage] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<DesktopItem | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('icon');
  const [showAppPicker, setShowAppPicker] = useState<boolean>(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [swapPrompt, setSwapPrompt] = useState<{
    show: boolean;
    message: string;
    onConfirm: (() => void) | null;
  }>({ show: false, message: '', onConfirm: null });
  const [deletePagePrompt, setDeletePagePrompt] = useState<{
    show: boolean;
    page: number;
  }>({ show: false, page: 0 });

  // 选中项目位置的受控输入
  const [editRow, setEditRow] = useState<string>('');
  const [editCol, setEditCol] = useState<string>('');
  const [editPage, setEditPage] = useState<string>('');

  // 当选中项改变时，同步局部状态
  useEffect(() => {
    if (selectedItem) {
      setEditRow(String(selectedItem.y + 1));
      setEditCol(String(selectedItem.x + 1));
      setEditPage(String((selectedItem.page ?? activePage) + 1));
    }
  }, [selectedItem, activePage]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 1800);
  };

  const installedRuntimeApps = useMemo(
    () => getInstalledRuntimeMarketApps(installedAppIds, uploadedApps),
    [installedAppIds, uploadedApps]
  );

  // 获取已注册的非系统应用，并合并应用市场已安装应用
  const apps = useMemo<EditableAppItem[]>(() => {
    const staticApps: EditableAppItem[] = localApps
      .filter((app) => app.isSystem || installedAppIds.includes(app.id))
      .map((app) => ({
        id: app.id,
        name: app.name,
        color: app.color,
      }));

    const runtimeApps: EditableAppItem[] = installedRuntimeApps.map((app) => ({
      id: app.id,
      name: app.name,
      color: '#EEF2FF',
      runtimeIcon: app.icon,
    }));

    const map = new Map<string, EditableAppItem>();
    staticApps.forEach((app) => map.set(app.id, app));
    runtimeApps.forEach((app) => map.set(app.id, app));
    return [...map.values()];
  }, [installedAppIds, installedRuntimeApps]);

  const selectableApps = apps.filter((app) => !isSystemAppId(app.id));

  // 获取所有已注册组件
  const availableWidgets = getAllWidgets();

  const appsById = useMemo(() => {
    const map = new Map<string, EditableAppItem>();
    apps.forEach((app) => map.set(app.id, app));
    return map;
  }, [apps]);

  const widgetsById = useMemo(() => {
    const map = new Map<string, (typeof availableWidgets)[number]>();
    availableWidgets.forEach(w => map.set(w.id, w));
    return map;
  }, [availableWidgets]);

  // 桌面项目列表（兼容旧数据）
  const items = desktopLayout.items || [];

  const maxPageFromItems = items.reduce((max, item) => Math.max(max, item.page ?? 0), 0);
  const computedPageCount = Math.max(desktopLayout.pageCount || 1, maxPageFromItems + 1);
  const hasNextPage = activePage < computedPageCount - 1;

  useEffect(() => {
    if (desktopLayout.pageCount !== computedPageCount) {
      updateDesktopLayout({ pageCount: computedPageCount });
    }
  }, [desktopLayout.pageCount, computedPageCount, updateDesktopLayout]);

  // 当前页应用（类型：应用）
  const currentPageApps = items.filter(item => item.type === 'app' && item.page === activePage);

  // 当前页组件（类型：组件）
  const currentPageWidgets = items.filter(item => item.type === 'widget' && item.page === activePage);

  const isPositionValid = (
    candidate: { x: number; y: number; w: number; h: number; page: number },
    ignoreInstanceId?: string
  ) => {
    if (candidate.x < 0 || candidate.y < 0) return false;
    if (candidate.x + candidate.w > cols || candidate.y + candidate.h > rows) return false;

    return !items.some(item => {
      if (item.page !== candidate.page) return false;
      if (ignoreInstanceId && item.instanceId === ignoreInstanceId) return false;
      const itemW = item.w || 1;
      const itemH = item.h || 1;
      return (
        candidate.x < item.x + itemW &&
        candidate.x + candidate.w > item.x &&
        candidate.y < item.y + itemH &&
        candidate.y + candidate.h > item.y
      );
    });
  };

  const getOverlaps = (
    candidate: { x: number; y: number; w: number; h: number; page: number },
    ignoreIds: string[] = []
  ) => {
    return items.filter(item => {
      if (item.page !== candidate.page) return false;
      if (ignoreIds.includes(item.instanceId)) return false;
      const itemW = item.w || 1;
      const itemH = item.h || 1;
      return (
        candidate.x < item.x + itemW &&
        candidate.x + candidate.w > item.x &&
        candidate.y < item.y + itemH &&
        candidate.y + candidate.h > item.y
      );
    });
  };

  const isPositionValidWithIgnore = (
    candidate: { x: number; y: number; w: number; h: number; page: number },
    ignoreIds: string[]
  ) => {
    if (candidate.x < 0 || candidate.y < 0) return false;
    if (candidate.x + candidate.w > cols || candidate.y + candidate.h > rows) return false;
    return getOverlaps(candidate, ignoreIds).length === 0;
  };

  const findFirstValidPosition = (w: number, h: number) => {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (isPositionValid({ x: col, y: row, w, h, page: activePage })) {
          return { x: col, y: row };
        }
      }
    }
    return null;
  };

  // 追踪是否已经初始化过


  // 处理项目位置更新
  const handleUpdateItemPosition = (instanceId: string, x: number, y: number) => {
    const item = items.find(i => i.instanceId === instanceId);
    if (!item) return false;
    const w = item.w || 1;
    const h = item.h || 1;
    if (!isPositionValid({ x, y, w, h, page: activePage }, instanceId)) {
      const overlaps = getOverlaps({ x, y, w, h, page: activePage }, [instanceId]);
      if (overlaps.length === 1) {
        const target = overlaps[0];
        const targetW = target.w || 1;
        const targetH = target.h || 1;
        const targetName = target.type === 'app'
          ? (appsById.get(target.componentId)?.name || '应用')
          : (widgetsById.get(target.componentId)?.name || '组件');
        setSwapPrompt({
          show: true,
          message: `目标位置被“${targetName}”占用，是否交换位置？`,
          onConfirm: () => {
            const ignoreIds = [instanceId, target.instanceId];
            const canPlaceTargetHere = isPositionValidWithIgnore(
              { x: item.x, y: item.y, w: targetW, h: targetH, page: activePage },
              ignoreIds
            );
            const canPlaceItemThere = isPositionValidWithIgnore(
              { x, y, w, h, page: activePage },
              ignoreIds
            );
            if (canPlaceTargetHere && canPlaceItemThere) {
              updateDesktopItem(target.instanceId, { x: item.x, y: item.y, page: activePage });
              updateDesktopItem(instanceId, { x, y, page: activePage });
              setSelectedItem(prev => prev ? { ...prev, page: activePage, x, y } : null);
            } else {
              showToast('无法交换位置');
            }
          }
        });
        return false;
      }
      showToast('位置无效，已恢复原位。');
      return false;
    }
    updateDesktopItem(instanceId, { page: activePage, x, y });
    setSelectedItem(prev => prev ? { ...prev, page: activePage, x, y } : null);
    return true;
  };

  const handleUpdateItemPlacement = (instanceId: string, x: number, y: number, page: number) => {
    const item = items.find(i => i.instanceId === instanceId);
    if (!item) return false;
    const w = item.w || 1;
    const h = item.h || 1;
    if (!isPositionValid({ x, y, w, h, page }, instanceId)) {
      const overlaps = getOverlaps({ x, y, w, h, page }, [instanceId]);
      if (overlaps.length === 1) {
        const target = overlaps[0];
        const targetW = target.w || 1;
        const targetH = target.h || 1;
        const sourcePage = item.page ?? 0;
        const targetName = target.type === 'app'
          ? (appsById.get(target.componentId)?.name || '应用')
          : (widgetsById.get(target.componentId)?.name || '组件');
        setSwapPrompt({
          show: true,
          message: page !== sourcePage
            ? `目标位置被“${targetName}”占用，是否跨页交换？`
            : `目标位置被“${targetName}”占用，是否交换位置？`,
          onConfirm: () => {
            const ignoreIds = [instanceId, target.instanceId];
            const canPlaceTargetHere = isPositionValidWithIgnore(
              { x: item.x, y: item.y, w: targetW, h: targetH, page: sourcePage },
              ignoreIds
            );
            const canPlaceItemThere = isPositionValidWithIgnore(
              { x, y, w, h, page },
              ignoreIds
            );
            if (canPlaceTargetHere && canPlaceItemThere) {
              updateDesktopItem(target.instanceId, { page: sourcePage, x: item.x, y: item.y });
              updateDesktopItem(instanceId, { page, x, y });
              setSelectedItem(prev => prev ? { ...prev, page, x, y } : null);
              setActivePage(page);
            } else {
              showToast('无法交换位置');
            }
          }
        });
        return false;
      }
      showToast('目标位置已被占用');
      return false;
    }
    updateDesktopItem(instanceId, { page, x, y });
    setSelectedItem(prev => prev ? { ...prev, page, x, y } : null);
    setActivePage(page);
    return true;
  };

  const handleUpdateItemPage = (instanceId: string, page: number) => {
    return handleUpdateItemPlacement(instanceId, selectedItem?.x ?? 0, selectedItem?.y ?? 0, page);
  };

  const resetEditsFromItem = (item: DesktopItem) => {
    setEditRow(String(item.y + 1));
    setEditCol(String(item.x + 1));
    setEditPage(String((item.page ?? activePage) + 1));
  };

  const applyEditsForSelected = () => {
    if (!selectedItem) return;
    const item = items.find(i => i.instanceId === selectedItem.instanceId);
    if (!item) return;
    const rowNum = parseInt(editRow, 10);
    const colNum = parseInt(editCol, 10);
    const pageNum = parseInt(editPage, 10);

    if ([rowNum, colNum, pageNum].some(n => Number.isNaN(n))) {
      showToast('请输入有效的行、列和页码。');
      resetEditsFromItem(item);
      return;
    }
    if (rowNum < 1 || rowNum > rows || colNum < 1 || colNum > cols) {
      showToast('行列超出范围。');
      resetEditsFromItem(item);
      return;
    }
    if (pageNum < 1 || pageNum > computedPageCount) {
      showToast('页码超出范围');
      resetEditsFromItem(item);
      return;
    }

    const x = colNum - 1;
    const y = rowNum - 1;
    const pageIndex = pageNum - 1;
    const ok = handleUpdateItemPlacement(item.instanceId, x, y, pageIndex);
    if (!ok) {
      resetEditsFromItem(item);
    }
  };

  const handleDeletePage = (pageIndex: number) => {
    if (pageIndex <= 0) {
      showToast('首页不能删除');
      return;
    }
    const itemsToDelete = items.filter(item => (item.page ?? 0) === pageIndex);
    itemsToDelete.forEach(item => removeDesktopItem(item.instanceId));

    const itemsToShift = items.filter(item => (item.page ?? 0) > pageIndex);
    itemsToShift.forEach(item => {
      updateDesktopItem(item.instanceId, { page: (item.page ?? 0) - 1 });
    });

    updateDesktopLayout({ pageCount: Math.max(1, computedPageCount - 1) });

    const nextActivePage = pageIndex === activePage
      ? Math.max(0, activePage - 1)
      : activePage > pageIndex
        ? activePage - 1
        : activePage;
    setActivePage(nextActivePage);

    if (selectedItem) {
      if ((selectedItem.page ?? 0) === pageIndex) {
        setSelectedItem(null);
      } else if ((selectedItem.page ?? 0) > pageIndex) {
        setSelectedItem({ ...selectedItem, page: (selectedItem.page ?? 0) - 1 });
      }
    }
  };

  // 添加组件到桌面
  const handleAddWidget = (widgetId: string) => {
    const widgetConfig = availableWidgets.find(w => w.id === widgetId);
    if (!widgetConfig) return;

    // 查找第一个空位
    const position = findFirstValidPosition(widgetConfig.defaultWidth, widgetConfig.defaultHeight);
    if (!position) {
      showToast('没有空位可放置该组件');
      return;
    }

    addDesktopItem({
      componentId: widgetId,
      type: 'widget',
      page: activePage,
      x: position.x,
      y: position.y,
      w: widgetConfig.defaultWidth,
      h: widgetConfig.defaultHeight,
    });

    setShowWidgetPicker(false);
  };

  // 添加应用图标到桌面
  const handleAddApp = (appId: string) => {
    const isInstalled = isSystemAppId(appId) || installedAppIds.includes(appId);
    if (!isInstalled) {
      showToast('请先在应用市场安装该应用');
      return;
    }

    if (items.some(item => item.type === 'app' && item.componentId === appId)) {
      showToast('该图标已存在');
      return;
    }

    const position = findFirstValidPosition(1, 1);
    if (!position) {
      showToast('没有空位可放置该图标');
      return;
    }

    addDesktopItem({
      componentId: appId,
      type: 'app',
      page: activePage,
      x: position.x,
      y: position.y,
      w: 1,
      h: 1,
    });

    setShowAppPicker(false);
  };

  // 移除桌面项目

  const handleRemoveItem = (instanceId: string) => {
    const item = items.find(i => i.instanceId === instanceId);
    // 如果是系统内置应用，不能删除
    if (item && item.type === 'app' && isSystemAppId(item.componentId)) {
      return;
    }
    removeDesktopItem(instanceId);
    setSelectedItem(null);
  };

  // 检查是否为系统内置应用
  const isSystemApp = (componentId: string) => isSystemAppId(componentId);

  return (
    <>
    <AnimatePresence mode="wait">
      <motion.div
        key="desktop-edit"
        className="relative flex-1 min-h-0 flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50 font-sans"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {/* 主体区域（手机预览） */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
        </div>

        <div className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="flex flex-col items-center pt-4 pb-3 px-4">
            <div className="w-full max-w-[420px] mb-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">桌面</div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 bg-white/70 backdrop-blur border border-slate-200/70 rounded-full px-2 py-1">
                    {activePage + 1}页
                  </span>
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-500">请先选择网格项，再在下方编辑行列位置。</div>
            </div>

            <motion.div
              className="relative w-full max-w-[340px] aspect-[9/19.5] rounded-[3rem] border-[6px] border-slate-900 shadow-[0_28px_70px_-35px_rgba(2,6,23,0.55)] overflow-hidden flex flex-col bg-gradient-to-b from-slate-100 to-slate-200"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {/* 刘海/灵动岛装饰*/}
              <div className="absolute inset-0 bg-gradient-to-br from-sky-200/40 via-white/40 to-amber-200/40 pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.75),rgba(255,255,255,0)_55%)] pointer-events-none" />

              <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-10 pointer-events-none">
                <div className="w-24 h-5 bg-slate-950/90 rounded-b-2xl shadow-[0_6px_12px_-8px_rgba(0,0,0,0.8)]" />
              </div>

              {/* 网格内容（支持滚动） */}
              <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pt-10 pb-8 px-4">
              <div
                className="grid gap-x-2 gap-y-3"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {/* 生成网格 */}
                {Array.from({ length: rows * cols }).map((_, index) => {
                  const row = Math.floor(index / cols);
                  const col = index % cols;

                  // 查找该位置的应用
                  const appItem = currentPageApps.find(a => a.x === col && a.y === row);
                  const app = appItem ? appsById.get(appItem.componentId) : null;
                  const appDisplay = appItem
                    ? (app ?? {
                        id: appItem.componentId,
                        name: '应用',
                        color: '#f1f5f9',
                      })
                    : null;

                  // 查找该位置的组件
                  const widgetItem = currentPageWidgets.find(w =>
                    w.x <= col && col < w.x + w.w && w.y <= row && row < w.y + w.h
                  );
                  const widgetConfig = widgetItem ? widgetsById.get(widgetItem.componentId) : null;
                  const isWidgetStart = !!(widgetItem && widgetItem.x === col && widgetItem.y === row);

                  const isSelected = selectedItem?.instanceId === appItem?.instanceId || selectedItem?.instanceId === widgetItem?.instanceId;
                  const isOccupied = !!appItem || !!widgetItem;

                  return (
                    <motion.button
                      type="button"
                      key={`${row}-${col}`}
                      variants={itemVariants}
                      className={`group aspect-square rounded-2xl border flex items-center justify-center cursor-pointer transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 ${
                        isSelected
                          ? 'border-transparent bg-sky-50/80 ring-2 ring-sky-500/60 shadow-[0_10px_24px_-18px_rgba(2,132,199,0.6)]'
                          : isOccupied
                            ? 'border-white/60 bg-white/55 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.45)] hover:bg-white/70 hover:border-white/80'
                            : 'border-white/40 bg-white/35 hover:bg-white/55 hover:border-white/60'
                      }`}
                      onClick={() => {
                        if (appItem) {
                          setSelectedItem(appItem);
                          setEditMode('icon');
                        } else if (widgetItem) {
                          setSelectedItem(widgetItem);
                          setEditMode('widget');
                        } else {
                          setSelectedItem(null);
                        }
                      }}
                    >
                      {appDisplay ? (
                        <div className="flex flex-col items-center w-full px-1">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ring-1 ring-white/60"
                            style={{ backgroundColor: appDisplay.color || '#f1f5f9' }}
                          >
                            {appDisplay.runtimeIcon ? (
                              <span className="text-base leading-none">{appDisplay.runtimeIcon}</span>
                            ) : (
                              <span className="text-sm font-semibold text-slate-900/90">{appDisplay.name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-600 mt-1 truncate max-w-full drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">{appDisplay.name}</span>
                        </div>
                      ) : widgetItem ? (
                        <div className="flex flex-col items-center w-full px-1">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ring-1 shadow-sm ${
                            isWidgetStart ? 'bg-gradient-to-br from-amber-100 to-orange-100 ring-amber-200/70' : 'bg-slate-100/70 ring-slate-200/70'
                          }`}>
                            {isWidgetStart ? (
                              <span className="text-xs font-semibold text-amber-700">
                                {(widgetItem.data?.name || widgetConfig?.name || '组件').charAt(0)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-300"> </span>
                            )}
                          </div>
                          {isWidgetStart ? (
                            <div className="mt-1 w-full flex items-center justify-center gap-1">
                              <span className="text-[9px] text-slate-600 truncate max-w-full drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">
                                {widgetItem.data?.name || widgetConfig?.name}
                              </span>
                              <span className="shrink-0 text-[9px] text-slate-500 bg-white/70 border border-white/80 rounded-full px-1.5 py-0.5">
                                {widgetItem.w}x{widgetItem.h}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-2 w-8 h-1.5 rounded-full bg-slate-200/70" aria-hidden />
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">{row + 1},{col + 1}</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
          </div>
        </div>

        {/* 底部控制面板 */}
        <footer className="shrink-0 pb-6 pt-3 px-4 bg-white/80 backdrop-blur border-t border-slate-200/70 shadow-[0_-10px_30px_-24px_rgba(2,6,23,0.55)] z-20">
          <div className="mx-auto w-full max-w-[420px]">
            {/* 编辑模式切换 */}
            <div className="flex items-center justify-center mb-3">
              <div className="flex w-full items-center gap-1 rounded-2xl bg-slate-100/80 p-1 border border-slate-200/70">
                <button
                  onClick={() => {
                    setEditMode('icon');
                    setShowWidgetPicker(false);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${
                    editMode === 'icon'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <LayoutGrid className="inline w-3.5 h-3.5 mr-1.5" />
                  图标
                </button>
                <button
                  onClick={() => {
                    setEditMode('widget');
                    setShowAppPicker(false);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${
                    editMode === 'widget'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <Sparkles className="inline w-3.5 h-3.5 mr-1.5" />
                  小组件                </button>
              </div>
              </div>

          {/* 选中项目设置 - 图标模式 */}
          {editMode === 'icon' && selectedItem && selectedItem.type === 'app' ? (
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">行</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9]*"
                  value={editRow} // 改为受控值
                  onChange={(e) => setEditRow(e.target.value.replace(/\D/g, ''))} // 实时更新输入
                  className="w-full h-9 bg-white/80 border border-slate-200/80 rounded-xl text-center text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">列</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9]*"
                  value={editCol} // 改为受控值
                  onChange={(e) => setEditCol(e.target.value.replace(/\D/g, ''))} // 实时更新输入
                  className="w-full h-9 bg-white/80 border border-slate-200/80 rounded-xl text-center text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">页</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9]*"
                  value={editPage}
                  onChange={(e) => setEditPage(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-9 bg-white/80 border border-slate-200/80 rounded-xl text-center text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                />
              </div>
              <button
                onClick={applyEditsForSelected}
                className="h-9 px-3 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200/70 text-emerald-700 hover:bg-emerald-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => handleRemoveItem(selectedItem.instanceId)}
                disabled={selectedItem.type === 'app' && isSystemApp(selectedItem.componentId)}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 ${
                  selectedItem.type === 'app' && isSystemApp(selectedItem.componentId)
                    ? 'bg-white/60 border border-slate-200/70 text-slate-300 cursor-not-allowed focus-visible:ring-slate-300/40'
                    : 'bg-red-50 border border-red-200/70 text-red-600 hover:bg-red-100 focus-visible:ring-red-500/40'
                }`}
              >
                <Trash2
                  size={14}
                  className={selectedItem.type === 'app' && isSystemApp(selectedItem.componentId)
                    ? 'text-slate-300'
                    : 'text-red-600'}
                />
              </button>
            </div>
          ) : editMode === 'icon' && showAppPicker ? (
            <div className="mb-3">
              <div className="text-xs text-slate-400 mb-2">选择要添加的应用图标：</div>
              <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1">
                {selectableApps.map((app, index) => (
                  <button
                    key={app.id || `app-${index}`}
                    onClick={() => handleAddApp(app.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/70 border border-slate-200/70 rounded-xl text-xs hover:bg-white transition-colors shadow-[0_10px_24px_-24px_rgba(15,23,42,0.5)]"
                  >
                    <div
                      className="w-7 h-7 rounded-lg border border-white/70 flex items-center justify-center"
                      style={{ backgroundColor: app.color || '#f1f5f9' }}
                    >
                      {app.runtimeIcon ? (
                        <span className="text-sm leading-none">{app.runtimeIcon}</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-800">{app.name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="flex-1 text-left font-semibold text-slate-800 truncate">{app.name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAppPicker(false)}
                className="mt-2 w-full py-2 bg-white/70 border border-slate-200/70 text-slate-600 rounded-xl text-xs font-semibold hover:bg-white transition-colors"
              >
                取消
              </button>
            </div>
          ) : editMode === 'icon' ? (
            <div className="text-center text-xs text-slate-400 mb-3">点击网格中的图标设置位置</div>
          ) : null}

          {/* 选中项目设置 - 组件模式 */}
          {editMode === 'widget' && selectedItem && selectedItem.type === 'widget' ? (
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">行</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9]*"
                  value={editRow} // 改为受控值
                  onChange={(e) => setEditRow(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-9 bg-white/80 border border-slate-200/80 rounded-xl text-center text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">列</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9]*"
                  value={editCol} // 改为受控值
                  onChange={(e) => setEditCol(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-9 bg-white/80 border border-slate-200/80 rounded-xl text-center text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">页</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9]*"
                  value={editPage}
                  onChange={(e) => setEditPage(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-9 bg-white/80 border border-slate-200/80 rounded-xl text-center text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                />
              </div>
              <button
                onClick={applyEditsForSelected}
                className="h-9 px-3 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200/70 text-emerald-700 hover:bg-emerald-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => handleRemoveItem(selectedItem.instanceId)}
                className="h-9 px-3 bg-red-50 border border-red-200/70 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : editMode === 'widget' && showWidgetPicker ? (
            <div className="mb-3">
              <div className="text-xs text-slate-400 mb-2">选择要添加的小组件：</div>
              <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1">
                {availableWidgets.map((widget, index) => (
                  <button
                    key={widget.id || `widget-${index}`}
                    onClick={() => {
                      if (widget.id === 'custom-widget') {
                        setShowWidgetPicker(false);
                        onNavigateToWidgetEditor?.(widget.id);
                        return;
                      }
                      handleAddWidget(widget.id);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-white/70 border border-slate-200/70 rounded-xl text-xs hover:bg-white transition-colors shadow-[0_10px_24px_-24px_rgba(15,23,42,0.5)]"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/80 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-slate-700">{widget.name.charAt(0)}</span>
                    </div>
                    <span className="flex-1 text-left font-semibold text-slate-800 truncate">{widget.name}</span>
                    <span className="shrink-0 text-[10px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-full px-1.5 py-0.5">
                      {widget.defaultWidth}x{widget.defaultHeight}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowWidgetPicker(false)}
                className="mt-2 w-full py-2 bg-white/70 border border-slate-200/70 text-slate-600 rounded-xl text-xs font-semibold hover:bg-white transition-colors"
              >
                取消
              </button>
            </div>
          ) : null}

          {/* 页面控制和操作按钮*/}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivePage(Math.max(0, activePage - 1))}
                disabled={activePage === 0}
                className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                  activePage === 0
                    ? 'bg-white/60 border-slate-200/70 text-slate-300 cursor-not-allowed'
                    : 'bg-white/70 border-slate-200/70 text-slate-700 hover:bg-white'
                }`}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-slate-700">第 {activePage + 1} 页</span>
              <button
                onClick={() => setActivePage(activePage + 1)}
                disabled={!hasNextPage}
                className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                  hasNextPage
                    ? 'bg-white/70 border-slate-200/70 text-slate-700 hover:bg-white'
                    : 'bg-white/60 border-slate-200/70 text-slate-300 cursor-not-allowed'
                }`}
                aria-label="下一页"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => {
                  const nextPage = Math.max(activePage, computedPageCount - 1) + 1;
                  updateDesktopLayout({ pageCount: computedPageCount + 1 });
                  setActivePage(nextPage);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-sky-600 border border-sky-600 text-white hover:bg-sky-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                aria-label="添加页面"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => setDeletePagePrompt({ show: true, page: activePage })}
                disabled={activePage === 0 || computedPageCount <= 1}
                className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 ${
                  activePage === 0 || computedPageCount <= 1
                    ? 'bg-white/60 border-slate-200/70 text-slate-300 cursor-not-allowed focus-visible:ring-slate-300/40'
                    : 'bg-red-50 border-red-200/70 text-red-600 hover:bg-red-100 focus-visible:ring-red-500/40'
                }`}
                aria-label="删除页面"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {editMode === 'icon' && (!selectedItem || selectedItem.type !== 'app') && !showAppPicker && (
                <button
                  onClick={() => setShowAppPicker(true)}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-[0_10px_24px_-18px_rgba(2,132,199,0.7)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                >
                  <Plus className="inline w-3 h-3 mr-1" />
                  添加
                </button>
              )}
              {editMode === 'widget' && (!selectedItem || selectedItem.type !== 'widget') && (
                <button
                  onClick={() => setShowWidgetPicker(true)}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-[0_10px_24px_-18px_rgba(2,132,199,0.7)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                >
                  <Plus className="inline w-3 h-3 mr-1" />
                  添加
                </button>
              )}
            </div>
          </div>
        </div>
        </footer>

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 16, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 16, x: '-50%' }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-[120px] left-1/2 z-[200] bg-black/75 text-white px-4 py-2.5 rounded-xl text-[13px] shadow-lg flex items-center gap-2"
            >
              <AlertTriangle size={16} />
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
    <AnimatePresence>
      {swapPrompt.show && (
        <div className="fixed inset-0 z-[180] bg-black/40 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-white w-[300px] rounded-[12px] overflow-hidden shadow-xl"
          >
            <div className="px-5 py-6 text-center text-[15px] text-slate-900 border-b border-slate-100 font-semibold">
              {swapPrompt.message}
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setSwapPrompt({ show: false, message: '', onConfirm: null })}
                className="flex-1 py-3.5 text-[15px] text-slate-700 active:bg-slate-100 border-r border-slate-100"
              >
                取消
              </button>
              <button
                onClick={() => {
                  swapPrompt.onConfirm?.();
                  setSwapPrompt({ show: false, message: '', onConfirm: null });
                }}
                className="flex-1 py-3.5 text-[15px] text-sky-600 font-semibold active:bg-slate-100"
              >
                交换
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    <AnimatePresence>
      {deletePagePrompt.show && (
        <div className="fixed inset-0 z-[180] bg-black/40 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-white w-[300px] rounded-[12px] overflow-hidden shadow-xl"
          >
            <div className="px-5 py-6 text-center text-[15px] text-slate-900 border-b border-slate-100 font-semibold">
              确认删除第 {deletePagePrompt.page + 1} 页？该页所有图标和组件将被移除
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setDeletePagePrompt({ show: false, page: 0 })}
                className="flex-1 py-3.5 text-[15px] text-slate-700 active:bg-slate-100 border-r border-slate-100"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const pageIndex = deletePagePrompt.page;
                  setDeletePagePrompt({ show: false, page: 0 });
                  handleDeletePage(pageIndex);
                }}
                className="flex-1 py-3.5 text-[15px] text-rose-600 font-semibold active:bg-slate-100"
              >
                删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
};

export default DesktopEditModeView;


