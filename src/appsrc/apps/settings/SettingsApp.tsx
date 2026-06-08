import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Key, Shield, Info, Bell, Moon, Sparkles } from 'lucide-react';
import { useSettingsStore } from './store';
import { useGlobalDesktopStore } from '@baobaobaiOS/sdk';
import type { AppContext } from '../../../core/sdk/types';
import { APP_OPEN_MOTION, APP_CLOSE_MOTION } from '../../../core/appOpenMotion';
import { useMobileViewportPageStyle } from '../../../core/mobileViewport';
import { PUSH_OPEN_APP_MESSAGE_TYPE } from '../../../core/push/webPush';
import {
  CUSTOM_WIDGET_LIBRARY_CHANGED_EVENT,
  readCustomWidgetLibrary,
  removeCustomWidgetLibraryItem,
  upsertCustomWidgetLibraryItem,
} from '../../../core/customWidgetLibrary';
import { BeautifyView, ThemeManageView, IconManageView, FontManageView, WidgetManageView, WidgetEditorView, DesktopLayoutView, DesktopEditModeView, ApiSettingsView, PushNotificationView } from './components';

type ViewType = 'main' | 'api' | 'notifications' | 'beautify' | 'themeManage' | 'iconManage' | 'fontManage' | 'widgetManage' | 'widgetEditor' | 'layout' | 'editMode';

interface SettingsAppProps {
  onClose: () => void;
  context?: AppContext;
}

const isSettingsInitialView = (view: unknown): view is ViewType => (
  view === 'main' ||
  view === 'api' ||
  view === 'notifications' ||
  view === 'beautify' ||
  view === 'themeManage' ||
  view === 'iconManage' ||
  view === 'fontManage' ||
  view === 'widgetManage' ||
  view === 'widgetEditor' ||
  view === 'layout' ||
  view === 'editMode'
);

const createWidgetLibraryId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `widget-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const SettingsApp: React.FC<SettingsAppProps> = ({ onClose, context }) => {
  const { settings, updateSettings } = useSettingsStore();
  const { desktopLayout, addDesktopItem, updateDesktopItem, removeDesktopItem, updateDesktopLayout } = useGlobalDesktopStore();
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const initialView = context?.params?.initialView;
    return isSettingsInitialView(initialView) ? initialView : 'main';
  });
  const [widgetEditorId, setWidgetEditorId] = useState<string | undefined>(undefined);
  const [widgetEditorReturnTo, setWidgetEditorReturnTo] = useState<ViewType>('widgetManage');
  const [availableChatModels, setAvailableChatModels] = useState<string[]>([]);
  const [availableImageModels, setAvailableImageModels] = useState<string[]>([]);
  const [availableMemoryModels, setAvailableMemoryModels] = useState<string[]>([]);
  const [isLoadingChatModels, setIsLoadingChatModels] = useState(false);
  const [isLoadingImageModels, setIsLoadingImageModels] = useState(false);
  const [isLoadingMemoryModels, setIsLoadingMemoryModels] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showImageApiKey, setShowImageApiKey] = useState(false);
  const [showVoiceApiKey, setShowVoiceApiKey] = useState(false);
  const [showMemoryApiKey, setShowMemoryApiKey] = useState(false);
  const [localCustomWidgets, setLocalCustomWidgets] = useState(() => readCustomWidgetLibrary());
  const shouldFreezeViewport = currentView === 'api' || currentView === 'editMode';
  const viewportPageStyle = useMobileViewportPageStyle(!shouldFreezeViewport);

  const openThemeMarket = () => {
    window.dispatchEvent(
      new CustomEvent(PUSH_OPEN_APP_MESSAGE_TYPE, {
        detail: {
          type: PUSH_OPEN_APP_MESSAGE_TYPE,
          appId: 'appmarket',
          params: {
            initialChannel: 'themes',
          },
        },
      })
    );
  };

  useEffect(() => {
    const syncLocalCustomWidgets = () => setLocalCustomWidgets(readCustomWidgetLibrary());
    syncLocalCustomWidgets();
    window.addEventListener(CUSTOM_WIDGET_LIBRARY_CHANGED_EVENT, syncLocalCustomWidgets);
    window.addEventListener('storage', syncLocalCustomWidgets);
    return () => {
      window.removeEventListener(CUSTOM_WIDGET_LIBRARY_CHANGED_EVENT, syncLocalCustomWidgets);
      window.removeEventListener('storage', syncLocalCustomWidgets);
    };
  }, []);

  const findFirstSlot = (w: number, h: number, ignoreInstanceId?: string) => {
    const items = desktopLayout.items || [];
    const rows = desktopLayout.rows || 6;
    const cols = desktopLayout.cols || 4;
    const pages = desktopLayout.pageCount || 1;

    const isOverlapping = (page: number, x: number, y: number) => {
      return items.some(item => {
        if (ignoreInstanceId && item.instanceId === ignoreInstanceId) return false;
        if (item.page !== page) return false;
        const iw = item.w || 1;
        const ih = item.h || 1;
        return (
          x < item.x + iw &&
          x + w > item.x &&
          y < item.y + ih &&
          y + h > item.y
        );
      });
    };

    for (let page = 0; page < pages; page++) {
      for (let row = 0; row <= rows - h; row++) {
        for (let col = 0; col <= cols - w; col++) {
          if (!isOverlapping(page, col, row)) {
            return { page, x: col, y: row };
          }
        }
      }
    }
    return null;
  };

  const fetchModels = async (
    baseUrl: string,
    apiKey: string,
    setModels: (models: string[]) => void,
    setLoading: (loading: boolean) => void
  ) => {
    if (!baseUrl || !apiKey) return;
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) return;

      const data = await response.json();
      if (!data || !Array.isArray(data.data)) return;
      const models = (data.data as unknown[])
        .map((item) => {
          if (!item || typeof item !== 'object') return undefined;
          return (item as { id?: unknown }).id;
        })
        .filter((id): id is string => typeof id === 'string')
        .sort();
      setModels(models);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentView !== 'api') return;

    const chatBaseUrl = settings.baseUrl?.trim();
    const chatApiKey = settings.apiKey?.trim();
    const imageBaseUrl = (settings.imageBaseUrl || settings.baseUrl || '').trim();
    const imageApiKey = (settings.imageApiKey || settings.apiKey || '').trim();
    const memoryBaseUrl = (settings.memoryBaseUrl || '').trim();
    const memoryApiKey = (settings.memoryApiKey || '').trim();

    if (chatBaseUrl && chatApiKey) {
      fetchModels(chatBaseUrl, chatApiKey, setAvailableChatModels, setIsLoadingChatModels);
    }
    if (imageBaseUrl && imageApiKey) {
      fetchModels(imageBaseUrl, imageApiKey, setAvailableImageModels, setIsLoadingImageModels);
    }
    if (memoryBaseUrl && memoryApiKey) {
      fetchModels(memoryBaseUrl, memoryApiKey, setAvailableMemoryModels, setIsLoadingMemoryModels);
    }
  }, [
    currentView,
    settings.baseUrl,
    settings.apiKey,
    settings.imageBaseUrl,
    settings.imageApiKey,
    settings.memoryBaseUrl,
    settings.memoryApiKey,
  ]);

  const renderMainView = () => (
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-[13px] text-gray-500 uppercase tracking-wider px-4 mb-2">通用</h2>
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
          <button
            onClick={() => setCurrentView('api')}
            className="w-full flex items-center px-4 py-3 gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100"
          >
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center text-white">
              <Key size={18} />
            </div>
            <span className="flex-1 text-left text-[16px]">API 设置</span>
            <ChevronRight size={20} className="text-gray-300" />
          </button>

          <button
            onClick={() => setCurrentView('beautify')}
            className="w-full flex items-center px-4 py-3 gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <span className="flex-1 text-left text-[16px]">UI 美化</span>
            <ChevronRight size={20} className="text-gray-300" />
          </button>

          <button
            onClick={() => setCurrentView('notifications')}
            className="w-full flex items-center px-4 py-3 gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100"
          >
            <div className="w-7 h-7 bg-gray-500 rounded-lg flex items-center justify-center text-white">
              <Bell size={18} />
            </div>
            <span className="flex-1 text-left text-[16px]">通知</span>
            <ChevronRight size={20} className="text-gray-300" />
          </button>

          <div className="w-full flex items-center px-4 py-3 gap-3 opacity-50 cursor-not-allowed">
            <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
              <Moon size={18} />
            </div>
            <span className="flex-1 text-left text-[16px]">外观与深色模式</span>
            <ChevronRight size={20} className="text-gray-300" />
          </div>
        </div>
      </div>

      <div className="px-4 py-2">
        <h2 className="text-[13px] text-gray-500 uppercase tracking-wider px-4 mb-2">隐私与安全</h2>
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
          <div className="w-full flex items-center px-4 py-3 gap-3 opacity-50 cursor-not-allowed border-b border-gray-100">
            <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center text-white">
              <Shield size={18} />
            </div>
            <span className="flex-1 text-left text-[16px]">隐私</span>
            <ChevronRight size={20} className="text-gray-300" />
          </div>
          <div className="w-full flex items-center px-4 py-3 gap-3 opacity-50 cursor-not-allowed">
            <div className="w-7 h-7 bg-blue-400 rounded-lg flex items-center justify-center text-white">
              <Info size={18} />
            </div>
            <span className="flex-1 text-left text-[16px]">关于</span>
            <ChevronRight size={20} className="text-gray-300" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderApiView = () => (
    <ApiSettingsView
      settings={settings}
      updateSettings={updateSettings}
      availableChatModels={availableChatModels}
      availableImageModels={availableImageModels}
      availableMemoryModels={availableMemoryModels}
      isLoadingChatModels={isLoadingChatModels}
      isLoadingImageModels={isLoadingImageModels}
      isLoadingMemoryModels={isLoadingMemoryModels}
      showApiKey={showApiKey}
      showImageApiKey={showImageApiKey}
      showVoiceApiKey={showVoiceApiKey}
      showMemoryApiKey={showMemoryApiKey}
      onToggleShowApiKey={() => setShowApiKey((prev) => !prev)}
      onToggleShowImageApiKey={() => setShowImageApiKey((prev) => !prev)}
      onToggleShowVoiceApiKey={() => setShowVoiceApiKey((prev) => !prev)}
      onToggleShowMemoryApiKey={() => setShowMemoryApiKey((prev) => !prev)}
    />
  );

  const editingLibraryId = widgetEditorId?.startsWith('library:') ? widgetEditorId.slice('library:'.length) : undefined;
  const editingLibraryWidget = editingLibraryId
    ? [...(desktopLayout.customWidgets || []), ...localCustomWidgets].find((widget) => widget.id === editingLibraryId)
    : undefined;
  const editingItem = widgetEditorId && !editingLibraryId
    ? (desktopLayout.items || []).find(
        (item) =>
          item.instanceId === widgetEditorId &&
          item.type === 'widget' &&
          item.componentId === 'custom-widget' &&
          item.data?.templateId !== 'glass-frame'
      )
    : undefined;

  const initialWidgetConfig = editingLibraryWidget
    ? {
        name: editingLibraryWidget.name || '自定义组件',
        width: editingLibraryWidget.width || 2,
        height: editingLibraryWidget.height || 2,
        templateId: editingLibraryWidget.templateId || 'custom-code',
        widgetCode: editingLibraryWidget.widgetCode,
        cornerRadius: editingLibraryWidget.cornerRadius ?? 24,
        frosted: editingLibraryWidget.frosted ?? 8,
        shadow: editingLibraryWidget.shadow ?? 12,
      }
    : editingItem
    ? {
        name: editingItem.data?.name || '自定义组件',
        width: editingItem.w || 2,
        height: editingItem.h || 2,
        templateId: typeof editingItem.data?.templateId === 'string' ? editingItem.data.templateId : undefined,
        widgetCode: typeof editingItem.data?.widgetCode === 'string' ? editingItem.data.widgetCode : undefined,
        titleText: typeof editingItem.data?.titleText === 'string' ? editingItem.data.titleText : undefined,
        subtitle: typeof editingItem.data?.subtitle === 'string' ? editingItem.data.subtitle : undefined,
        titleColor: typeof editingItem.data?.titleColor === 'string' ? editingItem.data.titleColor : undefined,
        titleFontSize: typeof editingItem.data?.titleFontSize === 'number' ? editingItem.data.titleFontSize : undefined,
        musicTitle: typeof editingItem.data?.musicTitle === 'string' ? editingItem.data.musicTitle : undefined,
        musicArtist: typeof editingItem.data?.musicArtist === 'string' ? editingItem.data.musicArtist : undefined,
        cornerRadius: editingItem.data?.cornerRadius ?? 24,
        frosted: editingItem.data?.frosted ?? 8,
        shadow: editingItem.data?.shadow ?? 12,
      }
    : undefined;

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute left-0 right-0 z-50 flex flex-col overflow-hidden bg-[#F2F2F7] text-gray-900"
      style={viewportPageStyle}
    >
      <div className="shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 pt-12 pb-4 flex items-center justify-between">
        <button
          onClick={() => {
            if (currentView === 'main') {
              onClose();
            } else if (currentView === 'widgetEditor') {
              setCurrentView(widgetEditorReturnTo);
            } else if (currentView === 'editMode') {
              setCurrentView('layout');
            } else if (currentView === 'layout') {
              setCurrentView('beautify');
            } else if (currentView === 'themeManage' || currentView === 'iconManage' || currentView === 'fontManage' || currentView === 'widgetManage') {
              setCurrentView('beautify');
            } else {
              setCurrentView('main');
            }
          }}
          className="flex items-center text-[#007AFF] gap-1"
        >
          <ChevronLeft size={24} />
          <span className="text-[17px]">返回</span>
        </button>
        <h1 className="text-[17px] font-semibold absolute left-1/2 -translate-x-1/2">
          {currentView === 'main'
            ? '设置'
            : currentView === 'api'
            ? 'API 设置'
            : currentView === 'notifications'
            ? '通知'
            : currentView === 'beautify'
            ? 'UI 美化'
            : currentView === 'themeManage'
            ? '主题'
            : currentView === 'iconManage'
            ? '图标'
            : currentView === 'fontManage'
            ? '字体'
            : currentView === 'widgetManage'
            ? '组件管理'
            : currentView === 'widgetEditor'
            ? '编辑组件'
            : currentView === 'layout'
            ? '布局'
            : currentView === 'editMode'
            ? '编辑模式'
            : '图标'}
        </h1>
        <div className="w-10" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ x: currentView === 'main' ? -20 : 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: currentView === 'main' ? 20 : -20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 min-h-0 flex flex-col overflow-hidden"
        >
          {currentView === 'main' ? renderMainView() : currentView === 'api' ? renderApiView() : currentView === 'notifications' ? <PushNotificationView settings={settings} updateSettings={updateSettings} /> : currentView === 'beautify' ? <BeautifyView onNavigateToThemeManage={() => setCurrentView('themeManage')} onNavigateToIconManage={() => setCurrentView('iconManage')} onNavigateToFontManage={() => setCurrentView('fontManage')} onNavigateToWidgetManage={() => setCurrentView('widgetManage')} onNavigateToLayout={() => setCurrentView('layout')} /> : currentView === 'themeManage' ? <ThemeManageView onBack={() => setCurrentView('beautify')} onOpenThemeMarket={openThemeMarket} /> : currentView === 'iconManage' ? <IconManageView /> : currentView === 'fontManage' ? <FontManageView /> : currentView === 'widgetManage' ? <WidgetManageView onNavigateToEditor={(id) => { setWidgetEditorId(id); setWidgetEditorReturnTo('widgetManage'); setCurrentView('widgetEditor'); }} /> : currentView === 'widgetEditor' ? (
            <WidgetEditorView
              widgetId={widgetEditorId}
              initialConfig={initialWidgetConfig}
              onDelete={editingLibraryWidget ? () => {
                const deletedName = editingLibraryWidget.name?.trim();
                const deletedCode = editingLibraryWidget.widgetCode?.trim();
                const isSameCustomWidget = (name: unknown, widgetCode: unknown) => (
                  typeof name === 'string' &&
                  typeof widgetCode === 'string' &&
                  name.trim() === deletedName &&
                  widgetCode.trim() === deletedCode
                );
                updateDesktopLayout({
                  customWidgets: (desktopLayout.customWidgets || []).filter((widget) => (
                    widget.id !== editingLibraryWidget.id &&
                    !isSameCustomWidget(widget.name, widget.widgetCode)
                  )),
                  items: (desktopLayout.items || []).filter((item) => {
                    if (item.type !== 'widget' || item.componentId !== 'custom-widget') return true;
                    return !isSameCustomWidget(item.data?.name, item.data?.widgetCode);
                  }),
                });
                removeCustomWidgetLibraryItem(editingLibraryWidget.id, {
                  name: editingLibraryWidget.name,
                  widgetCode: editingLibraryWidget.widgetCode,
                });
                setCurrentView(widgetEditorReturnTo);
              } : editingItem ? () => {
                removeDesktopItem(editingItem.instanceId);
                setCurrentView(widgetEditorReturnTo);
              } : undefined}
              onSave={(config) => {
                const rows = desktopLayout.rows || 6;
                const cols = desktopLayout.cols || 4;
                const w = Math.min(Math.max(config.width, 1), cols);
                const h = Math.min(Math.max(config.height, 1), rows);
                const pageCount = desktopLayout.pageCount || 1;

                const libraryEntry = {
                  id: editingLibraryWidget?.id || createWidgetLibraryId(),
                  name: config.name,
                  width: w,
                  height: h,
                  templateId: config.templateId || 'custom-code',
                  widgetCode: config.widgetCode,
                  cornerRadius: config.cornerRadius,
                  frosted: config.frosted,
                  shadow: config.shadow,
                  data: {
                    name: config.name,
                    templateId: config.templateId || 'custom-code',
                    widgetCode: config.widgetCode,
                    cornerRadius: config.cornerRadius,
                    frosted: config.frosted,
                    shadow: config.shadow,
                  },
                };
                const isSameExistingLibraryWidget = (name: unknown, widgetCode: unknown) => (
                  typeof name === 'string' &&
                  typeof widgetCode === 'string' &&
                  name.trim() === editingLibraryWidget?.name?.trim() &&
                  widgetCode.trim() === editingLibraryWidget?.widgetCode?.trim()
                );

                const upsertLibraryEntry = () => {
                  upsertCustomWidgetLibraryItem(libraryEntry);
                  const currentWidgets = desktopLayout.customWidgets || [];
                  const existingIndex = currentWidgets.findIndex(
                    (widget) =>
                      widget.id === libraryEntry.id ||
                      (widget.widgetCode === config.widgetCode && widget.name === config.name)
                  );
                  updateDesktopLayout({
                    customWidgets:
                      existingIndex >= 0
                        ? currentWidgets.map((widget, index) =>
                            index === existingIndex ? { ...libraryEntry, id: widget.id } : widget
                          )
                        : [...currentWidgets, libraryEntry],
                  });
                };

                if (editingLibraryWidget) {
                  upsertCustomWidgetLibraryItem(libraryEntry);
                  updateDesktopLayout({
                    customWidgets: (desktopLayout.customWidgets || []).map((widget) =>
                      widget.id === editingLibraryWidget.id || isSameExistingLibraryWidget(widget.name, widget.widgetCode)
                        ? { ...libraryEntry, id: widget.id }
                        : widget
                    ),
                    items: (desktopLayout.items || []).map((item) => {
                      if (item.type !== 'widget' || item.componentId !== 'custom-widget') return item;
                      if (!isSameExistingLibraryWidget(item.data?.name, item.data?.widgetCode)) return item;
                      return {
                        ...item,
                        w,
                        h,
                        data: {
                          ...(item.data || {}),
                          name: config.name,
                          templateId: config.templateId || 'custom-code',
                          widgetCode: config.widgetCode,
                          cornerRadius: config.cornerRadius,
                          frosted: config.frosted,
                          shadow: config.shadow,
                        },
                      };
                    }),
                  });
                } else if (config.templateId === 'custom-code') {
                  upsertLibraryEntry();
                }

                if (editingLibraryWidget || (!editingItem && widgetEditorReturnTo === 'widgetManage' && config.templateId === 'custom-code')) {
                  setCurrentView(widgetEditorReturnTo);
                  return;
                } else if (editingItem) {
                  const canStayInPlace = (
                    editingItem.x + w <= cols &&
                    editingItem.y + h <= rows &&
                    !desktopLayout.items.some(item => {
                      if (item.instanceId === editingItem.instanceId) return false;
                      if (item.page !== editingItem.page) return false;
                      const iw = item.w || 1;
                      const ih = item.h || 1;
                      return (
                        editingItem.x < item.x + iw &&
                        editingItem.x + w > item.x &&
                        editingItem.y < item.y + ih &&
                        editingItem.y + h > item.y
                      );
                    })
                  );

                  let slot = { page: editingItem.page, x: editingItem.x, y: editingItem.y };
                  if (!canStayInPlace) {
                    const nextSlot = findFirstSlot(w, h, editingItem.instanceId);
                    if (nextSlot) {
                      slot = nextSlot;
                    } else {
                      updateDesktopLayout({ pageCount: pageCount + 1 });
                      slot = { page: pageCount, x: 0, y: 0 };
                    }
                  }

                  updateDesktopItem(editingItem.instanceId, {
                    page: slot.page,
                    x: slot.x,
                    y: slot.y,
                    w,
                    h,
                    data: {
                      name: config.name,
                      templateId: config.templateId,
                      widgetCode: config.widgetCode,
                      cornerRadius: config.cornerRadius,
                      frosted: config.frosted,
                      shadow: config.shadow,
                    },
                  });
                } else {
                  let slot = findFirstSlot(w, h);
                  if (!slot) {
                    updateDesktopLayout({ pageCount: pageCount + 1 });
                    slot = { page: pageCount, x: 0, y: 0 };
                  }
                  addDesktopItem({
                    componentId: 'custom-widget',
                    type: 'widget',
                    page: slot.page,
                    x: slot.x,
                    y: slot.y,
                    w,
                    h,
                    data: {
                      name: config.name,
                      templateId: config.templateId,
                      widgetCode: config.widgetCode,
                      cornerRadius: config.cornerRadius,
                      frosted: config.frosted,
                      shadow: config.shadow,
                    }
                  });
                }
                setCurrentView(widgetEditorReturnTo);
              }}
            />
          ) : currentView === 'layout' ? <DesktopLayoutView onEditLayout={() => setCurrentView('editMode')} /> : currentView === 'editMode' ? <DesktopEditModeView rows={desktopLayout.rows || 6} cols={desktopLayout.cols || 4} onNavigateToWidgetEditor={(id) => { setWidgetEditorId(id); setWidgetEditorReturnTo('editMode'); setCurrentView('widgetEditor'); }} /> : <IconManageView />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export type { SettingsAppProps };


