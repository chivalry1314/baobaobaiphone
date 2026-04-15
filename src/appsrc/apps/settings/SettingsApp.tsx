import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Key, Shield, Info, Bell, Moon, Sparkles } from 'lucide-react';
import { useSettingsStore } from './store';
import { useGlobalDesktopStore } from '@mimisOS/sdk';
import { APP_OPEN_MOTION, APP_CLOSE_MOTION } from '../../../core/appOpenMotion';
import { BeautifyView, ThemeManageView, IconManageView, FontManageView, WidgetManageView, WidgetEditorView, DesktopLayoutView, DesktopEditModeView, ApiSettingsView, PushNotificationView } from './components';

type ViewType = 'main' | 'api' | 'notifications' | 'beautify' | 'themeManage' | 'iconManage' | 'fontManage' | 'widgetManage' | 'widgetEditor' | 'layout' | 'editMode';

interface SettingsAppProps {
  onClose: () => void;
}

export const SettingsApp: React.FC<SettingsAppProps> = ({ onClose }) => {
  const { settings, updateSettings } = useSettingsStore();
  const { desktopLayout, addDesktopItem, updateDesktopItem, updateDesktopLayout } = useGlobalDesktopStore();
  const [currentView, setCurrentView] = useState<ViewType>('main');
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

  const editingItem = widgetEditorId
    ? (desktopLayout.items || []).find(
        (item) => item.instanceId === widgetEditorId && item.type === 'widget' && item.componentId === 'custom-widget'
      )
    : undefined;

  const initialWidgetConfig = editingItem
    ? {
        name: editingItem.data?.name || '自定义组件',
        width: editingItem.w || 2,
        height: editingItem.h || 2,
        backgroundImage: editingItem.data?.backgroundImage || editingItem.data?.placeholderIcon || '',
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
      className="absolute inset-0 z-50 bg-[#F2F2F7] flex flex-col text-gray-900"
    >
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 pt-12 pb-4 flex items-center justify-between">
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
            ? 'Push Notifications'
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
          className="flex-1 flex flex-col overflow-hidden"
        >
          {currentView === 'main' ? renderMainView() : currentView === 'api' ? renderApiView() : currentView === 'notifications' ? <PushNotificationView settings={settings} updateSettings={updateSettings} /> : currentView === 'beautify' ? <BeautifyView onNavigateToThemeManage={() => setCurrentView('themeManage')} onNavigateToIconManage={() => setCurrentView('iconManage')} onNavigateToFontManage={() => setCurrentView('fontManage')} onNavigateToWidgetManage={() => setCurrentView('widgetManage')} onNavigateToLayout={() => setCurrentView('layout')} /> : currentView === 'themeManage' ? <ThemeManageView onBack={() => setCurrentView('beautify')} /> : currentView === 'iconManage' ? <IconManageView /> : currentView === 'fontManage' ? <FontManageView /> : currentView === 'widgetManage' ? <WidgetManageView onNavigateToEditor={(id) => { setWidgetEditorId(id); setWidgetEditorReturnTo('widgetManage'); setCurrentView('widgetEditor'); }} /> : currentView === 'widgetEditor' ? (
            <WidgetEditorView
              widgetId={widgetEditorId}
              initialConfig={initialWidgetConfig}
              onSave={(config) => {
                const rows = desktopLayout.rows || 6;
                const cols = desktopLayout.cols || 4;
                const w = Math.min(Math.max(config.width, 1), cols);
                const h = Math.min(Math.max(config.height, 1), rows);
                const pageCount = desktopLayout.pageCount || 1;

                if (editingItem) {
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
                      backgroundImage: config.backgroundImage,
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
                      backgroundImage: config.backgroundImage,
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





