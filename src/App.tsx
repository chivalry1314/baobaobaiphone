import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, Clock3, Disc3, Grid2x2Plus, Image as ImageIcon, Palette, Type, Wallpaper } from 'lucide-react';
import { StatusBar } from './components/StatusBar';
import { HomeDock } from './components/HomeDock';
import { AppIcon } from './components/AppIcon';
import { HtmlRuntimeApp } from './components/HtmlRuntimeApp';
import { Widget } from './components/Widget';
import { LockScreen } from './components/LockScreen';
import { SystemBootScreen } from './components/SystemBootScreen';
import { getAppComponent, localApps } from './core/registry';
import { getWidgetById } from './core/widgetRegistry';
import type { DesktopItem } from './core/stores/types';
import { useDesktopCoreStore } from './core/stores/desktop/store';
import { hasCoreStoresHydrated, onCoreStoresHydrated } from './core/stores/hydration';
import { useSettingsCoreStore } from './core/stores/settings/store';
import { ensureWebPushSubscription, isPushOpenAppMessage, PUSH_OPEN_APP_MESSAGE_TYPE } from './core/push/webPush';
import { isSystemAppId, SYSTEM_APP_IDS } from './core/systemApps';
import { CUSTOM_WIDGET_LIBRARY_CHANGED_EVENT, readCustomWidgetLibrary } from './core/customWidgetLibrary';
import { hasAppMarketHydrated, onAppMarketHydrated, useAppMarketStore } from './appsrc/apps/appmarket/store';
import { getInstalledRuntimeMarketApps, isMarketAppId } from './appsrc/apps/appmarket/runtime';
import { WidgetPlaceholder } from './appsrc/apps/settings/components/WidgetPlaceholder';
import { DreamMusicAudioHost } from './appsrc/apps/dreammusic/DreamMusicAudioHost';

// 默认壁纸
const DEFAULT_WALLPAPER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="1440" height="3120" viewBox="0 0 1440 3120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#DFF3FF"/>
      <stop offset="52%" stop-color="#F1FAFF"/>
      <stop offset="100%" stop-color="#EAF6FF"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="24"/>
    </filter>
  </defs>
  <rect width="1440" height="3120" fill="url(#sky)"/>
  <g opacity="0.95" filter="url(#soft)">
    <ellipse cx="280" cy="560" rx="220" ry="88" fill="white"/>
    <ellipse cx="470" cy="600" rx="260" ry="98" fill="white"/>
    <ellipse cx="700" cy="540" rx="230" ry="90" fill="white"/>
    <ellipse cx="980" cy="620" rx="280" ry="104" fill="white"/>
    <ellipse cx="1210" cy="560" rx="200" ry="84" fill="white"/>
  </g>
  <g opacity="0.82" filter="url(#soft)">
    <ellipse cx="180" cy="1080" rx="180" ry="72" fill="white"/>
    <ellipse cx="380" cy="1140" rx="220" ry="86" fill="white"/>
    <ellipse cx="620" cy="1060" rx="200" ry="78" fill="white"/>
    <ellipse cx="860" cy="1130" rx="260" ry="94" fill="white"/>
    <ellipse cx="1140" cy="1050" rx="210" ry="80" fill="white"/>
  </g>
  <g opacity="0.72" filter="url(#soft)">
    <ellipse cx="300" cy="1660" rx="280" ry="104" fill="white"/>
    <ellipse cx="620" cy="1740" rx="320" ry="116" fill="white"/>
    <ellipse cx="980" cy="1680" rx="300" ry="108" fill="white"/>
    <ellipse cx="1280" cy="1760" rx="230" ry="88" fill="white"/>
  </g>
</svg>
`)}`;

interface RuntimeDesktopApp {
  id: string;
  name: string;
  icon: string;
  runtimeIcon?: string;
  html?: string;
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitCancelFullScreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

interface StandaloneNavigator extends Navigator {
  standalone?: boolean;
}

const getFullscreenElement = (doc: FullscreenDocument): Element | null => {
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
};

const isFullscreenActive = (doc: FullscreenDocument): boolean => Boolean(getFullscreenElement(doc));

const supportsFullscreenRequest = (el: FullscreenElement): boolean =>
  typeof el.requestFullscreen === 'function' ||
  typeof el.webkitRequestFullscreen === 'function' ||
  typeof el.webkitRequestFullScreen === 'function' ||
  typeof el.mozRequestFullScreen === 'function' ||
  typeof el.msRequestFullscreen === 'function';

const isIOSDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  const isIOSUserAgent = /iPad|iPhone|iPod/i.test(userAgent);
  const isMacTouchDevice = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOSUserAgent || isMacTouchDevice;
};

const isSafariBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  const isSafari = /Safari/i.test(userAgent);
  const isOtherBrowser =
    /Chrome|CriOS|FxiOS|EdgiOS|OPiOS|OPR|SamsungBrowser|Android/i.test(userAgent);
  return isSafari && !isOtherBrowser;
};

const isStandaloneDisplayMode = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const standaloneNavigator = navigator as StandaloneNavigator;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    standaloneNavigator.standalone === true
  );
};

const isWeChatEmbeddedBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  return /MicroMessenger/i.test(userAgent);
};

const requestBrowserFullscreen = async (el: FullscreenElement): Promise<void> => {
  if (typeof el.requestFullscreen === 'function') {
    await el.requestFullscreen();
    return;
  }

  if (typeof el.webkitRequestFullscreen === 'function') {
    await Promise.resolve(el.webkitRequestFullscreen());
    return;
  }

  if (typeof el.webkitRequestFullScreen === 'function') {
    await Promise.resolve(el.webkitRequestFullScreen());
    return;
  }

  if (typeof el.mozRequestFullScreen === 'function') {
    await Promise.resolve(el.mozRequestFullScreen());
    return;
  }

  if (typeof el.msRequestFullscreen === 'function') {
    await Promise.resolve(el.msRequestFullscreen());
    return;
  }

  throw new Error('Fullscreen API is not supported in this browser');
};

const exitBrowserFullscreen = async (doc: FullscreenDocument): Promise<void> => {
  if (typeof doc.exitFullscreen === 'function') {
    await doc.exitFullscreen();
    return;
  }

  if (typeof doc.webkitExitFullscreen === 'function') {
    await Promise.resolve(doc.webkitExitFullscreen());
    return;
  }

  if (typeof doc.webkitCancelFullScreen === 'function') {
    await Promise.resolve(doc.webkitCancelFullScreen());
    return;
  }

  if (typeof doc.mozCancelFullScreen === 'function') {
    await Promise.resolve(doc.mozCancelFullScreen());
    return;
  }

  if (typeof doc.msExitFullscreen === 'function') {
    await Promise.resolve(doc.msExitFullscreen());
  }
};

const isCellOccupied = (items: DesktopItem[], page: number, x: number, y: number): boolean => {
  return items.some((item) => {
    const itemPage = item.page ?? 0;
    if (itemPage !== page) return false;
    const width = item.w || 1;
    const height = item.h || 1;
    return x >= item.x && x < item.x + width && y >= item.y && y < item.y + height;
  });
};

const findNextAppSlot = (items: DesktopItem[], rows: number, cols: number) => {
  const maxPage = Math.max(0, ...items.map((item) => item.page ?? 0));
  for (let page = 0; page <= maxPage + 1; page += 1) {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (!isCellOccupied(items, page, x, y)) {
          return { page, x, y };
        }
      }
    }
  }
  return { page: maxPage + 1, x: 0, y: 0 };
};

const findNextWidgetSlot = (items: DesktopItem[], rows: number, cols: number, width: number, height: number) => {
  const maxPage = Math.max(0, ...items.map((item) => item.page ?? 0));
  const canPlace = (page: number, x: number, y: number) => {
    if (x + width > cols || y + height > rows) return false;
    for (let nextY = y; nextY < y + height; nextY += 1) {
      for (let nextX = x; nextX < x + width; nextX += 1) {
        if (isCellOccupied(items, page, nextX, nextY)) return false;
      }
    }
    return true;
  };

  for (let page = 0; page <= maxPage + 1; page += 1) {
    for (let y = 0; y <= rows - height; y += 1) {
      for (let x = 0; x <= cols - width; x += 1) {
        if (canPlace(page, x, y)) {
          return { page, x, y };
        }
      }
    }
  }
  return { page: maxPage + 1, x: 0, y: 0 };
};

const desktopWidgetSizes = [
  { label: '1x1', w: 1, h: 1 },
  { label: '2x2', w: 2, h: 2 },
  { label: '4x1', w: 4, h: 1 },
  { label: '4x2', w: 4, h: 2 },
  { label: '4x3', w: 4, h: 3 },
  { label: '4x4', w: 4, h: 4 },
];

const desktopFrameWidgetTemplates = [
  { id: 'ins-photo', name: 'ins照片', icon: ImageIcon, subtitle: '点击上传照片' },
  { id: 'calendar-card', name: '日历', icon: CalendarDays, subtitle: '半透明日历' },
  { id: 'vinyl-record', name: '唱片', icon: Disc3, subtitle: '复古唱片' },
  { id: 'clock-card', name: '时钟', icon: Clock3, subtitle: '大号时间' },
  { id: 'text-card', name: '文字', icon: Type, subtitle: '纪念日文字' },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getCustomWidgetDisplayName = (data: Record<string, any> | undefined): string => {
  const savedName = typeof data?.name === 'string' ? data.name.trim() : '';
  return savedName || '自定义组件';
};

const parsePendingPushLaunch = (): { appId: string; params?: Record<string, unknown> } | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const query = new URLSearchParams(window.location.search);
  const appId = query.get('mp_app')?.trim();
  if (!appId) {
    return null;
  }

  const rawParams = query.get('mp_params');
  if (!rawParams) {
    return { appId };
  }

  try {
    const parsed = JSON.parse(rawParams);
    if (isRecord(parsed)) {
      return { appId, params: parsed };
    }
  } catch {
    // ignore invalid params
  }

  return { appId };
};

const clearPendingPushLaunch = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const hadLaunchQuery =
    url.searchParams.has('mp_app') || url.searchParams.has('mp_params');
  if (!hadLaunchQuery) {
    return;
  }

  url.searchParams.delete('mp_app');
  url.searchParams.delete('mp_params');
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', nextUrl);
};

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [activeAppParams, setActiveAppParams] = useState<Record<string, unknown> | undefined>(undefined);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenHint, setFullscreenHint] = useState<string | null>(null);
  const [isStandalonePwa, setIsStandalonePwa] = useState<boolean>(() => isStandaloneDisplayMode());
  const [storesHydrated, setStoresHydrated] = useState(
    () => hasCoreStoresHydrated() && hasAppMarketHydrated()
  );
  const [localCustomWidgets, setLocalCustomWidgets] = useState(() => readCustomWidgetLibrary());
  const settings = useSettingsCoreStore((state) => state.settings);
  const updateSettings = useSettingsCoreStore((state) => state.updateSettings);
  const desktopLayout = useDesktopCoreStore((state) => state.desktopLayout);
  const updateDesktopItem = useDesktopCoreStore((state) => state.updateDesktopItem);
  const addDesktopItem = useDesktopCoreStore((state) => state.addDesktopItem);
  const removeDesktopItem = useDesktopCoreStore((state) => state.removeDesktopItem);
  const updateDesktopLayout = useDesktopCoreStore((state) => state.updateDesktopLayout);
  const { installedAppIds, uploadedApps, uninstallApp } = useAppMarketStore();

  // 初始化桌面布局
  const { cols = 4, rows = 6, items = [], pageCount = 1 } = desktopLayout;

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

  const installableLocalAppIdSet = useMemo(() => {
    return new Set(localApps.filter((app) => !app.isSystem).map((app) => app.id));
  }, []);

  const installedLocalAppIdSet = useMemo(() => {
    return new Set(installedAppIds.filter((appId) => installableLocalAppIdSet.has(appId)));
  }, [installedAppIds, installableLocalAppIdSet]);
  const [activePage, setActivePage] = useState(0);
  const [isDesktopEditing, setIsDesktopEditing] = useState(false);
  const [isDesktopEditMenuOpen, setIsDesktopEditMenuOpen] = useState(false);
  const [isDesktopWidgetPickerOpen, setIsDesktopWidgetPickerOpen] = useState(false);
  const [activeWidgetFrameMenuId, setActiveWidgetFrameMenuId] = useState<string | null>(null);
  const [draggingDesktopIcon, setDraggingDesktopIcon] = useState<{
    instanceId: string;
    dx: number;
    dy: number;
    clientX: number;
    clientY: number;
    sourcePage: number;
    pointerOffsetX: number;
    pointerOffsetY: number;
  } | null>(null);
  const [draggingDesktopWidget, setDraggingDesktopWidget] = useState<{
    instanceId: string;
    dx: number;
    dy: number;
    clientX: number;
    clientY: number;
    sourcePage: number;
    pointerOffsetX: number;
    pointerOffsetY: number;
  } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const desktopGridRef = useRef<HTMLDivElement | null>(null);
  const iconLongPressTimerRef = useRef<number | null>(null);
  const iconLongPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const iconDragRef = useRef<{
    pointerId: number;
    instanceId: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    sourcePage: number;
    pointerOffsetX: number;
    pointerOffsetY: number;
    moved: boolean;
  } | null>(null);
  const widgetDragRef = useRef<{
    pointerId: number;
    instanceId: string;
    startX: number;
    startY: number;
    sourcePage: number;
    pointerOffsetX: number;
    pointerOffsetY: number;
    moved: boolean;
  } | null>(null);
  const widgetResizeRef = useRef<{
    pointerId: number;
    instanceId: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const widgetClickSuppressRef = useRef(false);
  const desktopAutoPageTimerRef = useRef<number | null>(null);
  const desktopAutoPageTargetRef = useRef<number | null>(null);
  const fullscreenHintTimerRef = useRef<number | null>(null);
  const isDenseGrid = cols >= 5;
  const isIOSStandalonePwa = isIOSDevice() && isStandalonePwa;
  const isWeChatBrowser = isWeChatEmbeddedBrowser();
  const desktopDockBottomOffset = isIOSStandalonePwa || isWeChatBrowser ? 54 : 18;
  const shouldRenderCustomStatusBar = !isIOSStandalonePwa;
  const shouldRenderCustomHomeIndicator = !isIOSStandalonePwa;
  const effectiveIconSize = isDenseGrid ? Math.min(settings.iconSize, 52) : settings.iconSize;
  const effectiveIconRadius = Math.min(settings.iconRadius, Math.floor(effectiveIconSize / 2));
  const effectiveIconShadow = isDenseGrid ? Math.min(settings.iconShadow, 6) : settings.iconShadow;
  const fallbackFontStack = '"Inter", ui-sans-serif, system-ui, sans-serif';

  useEffect(() => {
    const updateHydratedState = () => {
      setStoresHydrated(
        hasCoreStoresHydrated() && hasAppMarketHydrated()
      );
    };

    updateHydratedState();
    const unsubscribeGlobal = onCoreStoresHydrated(updateHydratedState);
    const unsubscribeMarket = onAppMarketHydrated(updateHydratedState);

    return () => {
      unsubscribeGlobal();
      unsubscribeMarket();
    };
  }, []);

  useEffect(() => {
    if (!storesHydrated) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsBooting(false);
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [storesHydrated]);

  useEffect(() => {
    const doc = document as FullscreenDocument;
    const syncFullscreenState = () => {
      setIsFullscreen(isFullscreenActive(doc));
    };

    syncFullscreenState();
    doc.addEventListener('fullscreenchange', syncFullscreenState);
    doc.addEventListener('webkitfullscreenchange', syncFullscreenState as EventListener);
    doc.addEventListener('mozfullscreenchange', syncFullscreenState as EventListener);
    doc.addEventListener('MSFullscreenChange', syncFullscreenState as EventListener);

    return () => {
      doc.removeEventListener('fullscreenchange', syncFullscreenState);
      doc.removeEventListener('webkitfullscreenchange', syncFullscreenState as EventListener);
      doc.removeEventListener('mozfullscreenchange', syncFullscreenState as EventListener);
      doc.removeEventListener('MSFullscreenChange', syncFullscreenState as EventListener);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const syncStandaloneState = () => {
      setIsStandalonePwa(isStandaloneDisplayMode());
    };

    syncStandaloneState();
    mediaQuery.addEventListener?.('change', syncStandaloneState);
    window.addEventListener('visibilitychange', syncStandaloneState);

    return () => {
      mediaQuery.removeEventListener?.('change', syncStandaloneState);
      window.removeEventListener('visibilitychange', syncStandaloneState);
    };
  }, []);

  useEffect(() => {
    const KEYBOARD_HEIGHT_THRESHOLD = 120;
    let stableViewportHeight = Math.max(
      Math.round(window.innerHeight),
      Math.round(window.visualViewport?.height ?? window.innerHeight) +
        Math.max(0, Math.round(window.visualViewport?.offsetTop ?? 0))
    );

    const isEditableElementFocused = () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return false;
      if (active instanceof HTMLTextAreaElement) return !active.readOnly && !active.disabled;
      if (active instanceof HTMLInputElement) {
        if (active.readOnly || active.disabled) return false;
        const type = (active.type || 'text').toLowerCase();
        return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(type);
      }
      return active.isContentEditable;
    };

    const syncViewportMetrics = () => {
      const layoutViewportHeight = Math.round(window.innerHeight);
      const viewportHeight = Math.round(window.visualViewport?.height ?? layoutViewportHeight);
      const viewportOffsetTop = Math.max(0, Math.round(window.visualViewport?.offsetTop ?? 0));
      const fullViewportHeight = Math.max(layoutViewportHeight, viewportHeight + viewportOffsetTop);
      const keyboardLikelyOpen =
        isEditableElementFocused() &&
        stableViewportHeight - viewportHeight > KEYBOARD_HEIGHT_THRESHOLD;

      if (!keyboardLikelyOpen) stableViewportHeight = fullViewportHeight;
      const nextHeight = keyboardLikelyOpen ? stableViewportHeight : fullViewportHeight;
      document.documentElement.style.setProperty('--app-dvh', `${nextHeight}px`);
      document.documentElement.style.setProperty('--app-vv-offset-top', `${viewportOffsetTop}px`);
      document.documentElement.style.setProperty('--app-vv-height', `${viewportHeight}px`);
    };

    syncViewportMetrics();
    window.addEventListener('resize', syncViewportMetrics);
    window.addEventListener('orientationchange', syncViewportMetrics);
    window.visualViewport?.addEventListener('resize', syncViewportMetrics);
    window.visualViewport?.addEventListener('scroll', syncViewportMetrics);
    document.addEventListener('focusin', syncViewportMetrics);
    document.addEventListener('focusout', syncViewportMetrics);

    return () => {
      window.removeEventListener('resize', syncViewportMetrics);
      window.removeEventListener('orientationchange', syncViewportMetrics);
      window.visualViewport?.removeEventListener('resize', syncViewportMetrics);
      window.visualViewport?.removeEventListener('scroll', syncViewportMetrics);
      document.removeEventListener('focusin', syncViewportMetrics);
      document.removeEventListener('focusout', syncViewportMetrics);
    };
  }, []);

  useEffect(() => {
    const fontFamily = settings.fontFamily || fallbackFontStack;
    document.documentElement.style.setProperty('--font-sans', fontFamily);

    const styleId = 'custom-font-face';
    const existing = document.getElementById(styleId) as HTMLStyleElement | null;
    if (settings.customFontData && settings.customFontName) {
      const format = settings.customFontFormat || 'truetype';
      const css = `@font-face { font-family: "${settings.customFontName}"; src: url(${settings.customFontData}) format("${format}"); font-display: swap; }`;
      if (existing) {
        existing.textContent = css;
      } else {
        const styleTag = document.createElement('style');
        styleTag.id = styleId;
        styleTag.textContent = css;
        document.head.appendChild(styleTag);
      }
    } else if (existing) {
      existing.remove();
    }
  }, [settings.fontFamily, settings.customFontData, settings.customFontName, settings.customFontFormat]);

  // ================= 新增：桌面初始化逻辑 =================
  useEffect(() => {
    if (!storesHydrated) return;

    let nextItems = [...items];
    const hasAppIcon = (appId: string) =>
      nextItems.some((item) => item.type === 'app' && item.componentId === appId);

    SYSTEM_APP_IDS.forEach((appId) => {
      if (hasAppIcon(appId)) return;
      const slot = findNextAppSlot(nextItems, rows, cols);
      addDesktopItem({
        componentId: appId,
        type: 'app',
        page: slot.page,
        x: slot.x,
        y: slot.y,
        w: 1,
        h: 1,
      });
      nextItems = [
        ...nextItems,
        {
          instanceId: `system-${appId}`,
          componentId: appId,
          type: 'app',
          page: slot.page,
          x: slot.x,
          y: slot.y,
          w: 1,
          h: 1,
        },
      ];
    });
  }, [storesHydrated, items, rows, cols, addDesktopItem]);
  // ========================================================

  // 追踪上一次行列数的 ref
  const prevGrid = React.useRef({ rows, cols });

  // 监听桌面布局变化，只处理行列数更新时的重排
  useEffect(() => {
    const currentGrid = { rows, cols };
    const gridChanged = prevGrid.current.rows !== currentGrid.rows || prevGrid.current.cols !== currentGrid.cols;

    if (!gridChanged) {
      prevGrid.current = currentGrid;
      return;
    }

    const existingApps = items.filter(item => item.type === 'app');

    if (existingApps.length === 0) {
      prevGrid.current = currentGrid;
      return;
    }

    // 行列数变化了，重新排列所有 app 到新网格（按照索引顺序）
    existingApps.forEach((app: DesktopItem, index: number) => {
      const newX = index % cols;
      const newY = Math.floor(index / cols);
      if (app.x !== newX || app.y !== newY) {
        updateDesktopItem(app.instanceId, { x: newX, y: newY });
      }
    });

    // 更新 ref
    prevGrid.current = currentGrid;
  }, [rows, cols, items, updateDesktopItem]);

  const installedRuntimeApps = useMemo(
    () => getInstalledRuntimeMarketApps(installedAppIds, uploadedApps),
    [installedAppIds, uploadedApps]
  );

  const runtimeAppById = useMemo(
    () => new Map(installedRuntimeApps.map((app) => [app.id, app])),
    [installedRuntimeApps]
  );

  const desktopAppMap = useMemo(() => {
    const map = new Map<string, RuntimeDesktopApp>();
    localApps.forEach((app) => {
      map.set(app.id, {
        id: app.id,
        name: app.name,
        icon: app.icon,
      });
    });
    installedRuntimeApps.forEach((app) => {
      map.set(app.id, {
        id: app.id,
        name: app.name,
        icon: 'AppWindow',
        runtimeIcon: app.icon,
      });
    });
    return map;
  }, [installedRuntimeApps]);

  useEffect(() => {
    if (!storesHydrated) return;

    items.forEach((item) => {
      if (item.type !== 'app') return;
      if (isSystemAppId(item.componentId)) return;
      if (!installableLocalAppIdSet.has(item.componentId)) return;
      if (installedLocalAppIdSet.has(item.componentId)) return;
      removeDesktopItem(item.instanceId);
    });
  }, [storesHydrated, items, installedLocalAppIdSet, installableLocalAppIdSet, removeDesktopItem]);

  useEffect(() => {
    if (!storesHydrated) return;
    const installedIdSet = new Set(installedRuntimeApps.map((app) => app.id));
    const marketAppItems = items.filter((item) => item.type === 'app' && isMarketAppId(item.componentId));

    marketAppItems.forEach((item) => {
      if (!installedIdSet.has(item.componentId)) {
        removeDesktopItem(item.instanceId);
      }
    });

    const existingInstalledIds = new Set(
      marketAppItems
        .filter((item) => installedIdSet.has(item.componentId))
        .map((item) => item.componentId)
    );

    let nextItems = items.filter((item) => {
      if (item.type !== 'app') return true;
      if (!isMarketAppId(item.componentId)) return true;
      return installedIdSet.has(item.componentId);
    });

    installedRuntimeApps.forEach((app) => {
      if (existingInstalledIds.has(app.id)) return;
      const slot = findNextAppSlot(nextItems, rows, cols);
      addDesktopItem({
        componentId: app.id,
        type: 'app',
        page: slot.page,
        x: slot.x,
        y: slot.y,
        w: 1,
        h: 1,
      });
      nextItems = [
        ...nextItems,
        {
          instanceId: `runtime-${app.id}`,
          componentId: app.id,
          type: 'app',
          page: slot.page,
          x: slot.x,
          y: slot.y,
          w: 1,
          h: 1,
        },
      ];
    });
  }, [storesHydrated, items, rows, cols, installedRuntimeApps, addDesktopItem, removeDesktopItem]);

  // 获取当前激活的应用组件
  const ActiveAppComponent = activeAppId ? getAppComponent(activeAppId) : null;
  const activeRuntimeApp = activeAppId ? runtimeAppById.get(activeAppId) ?? null : null;

  const activeAppContext = useMemo(
    () => ({ activeAppId, params: activeAppParams }),
    [activeAppId, activeAppParams]
  );

  const openApp = useCallback((appId: string, params?: Record<string, unknown>) => {
    if (isDesktopEditing) return;
    setActiveAppParams(params);
    setActiveAppId(appId);
  }, [isDesktopEditing]);

  const openAppFromDesktopEditMenu = useCallback((appId: string, params?: Record<string, unknown>) => {
    setIsDesktopEditMenuOpen(false);
    setIsDesktopWidgetPickerOpen(false);
    setIsDesktopEditing(false);
    setActiveAppParams(params);
    setActiveAppId(appId);
  }, []);

  const closeActiveApp = useCallback(() => {
    setActiveAppId(null);
    setActiveAppParams(undefined);
  }, []);

  useEffect(() => {
    const launch = parsePendingPushLaunch();
    if (!launch) {
      return;
    }
    openApp(launch.appId, launch.params);
    clearPendingPushLaunch();
  }, [openApp]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const onServiceWorkerMessage = (event: MessageEvent<unknown>) => {
      if (!isPushOpenAppMessage(event.data)) {
        return;
      }
      openApp(event.data.appId, event.data.params);
    };

    navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage);
    };
  }, [openApp]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOpenApp = (event: Event) => {
      const customEvent = event as CustomEvent<unknown>;
      const payload = customEvent.detail;
      if (!isRecord(payload) || typeof payload.appId !== 'string') return;
      const nextParams =
        isRecord(payload.params) ? (payload.params as Record<string, unknown>) : undefined;
      openApp(payload.appId, nextParams);
    };

    window.addEventListener(PUSH_OPEN_APP_MESSAGE_TYPE, onOpenApp as EventListener);
    return () => {
      window.removeEventListener(PUSH_OPEN_APP_MESSAGE_TYPE, onOpenApp as EventListener);
    };
  }, [openApp]);

  useEffect(() => {
    if (!settings.pushEnabled) {
      return;
    }

    let cancelled = false;
    const pushSettings = {
      pushServerBaseUrl: settings.pushServerBaseUrl,
      pushUserId: settings.pushUserId,
      pushDeviceId: settings.pushDeviceId,
    };
    const syncPushSubscription = async () => {
      try {
        const result = await ensureWebPushSubscription(pushSettings);
        if (cancelled) {
          return;
        }

        const nextSettingsPatch: Partial<typeof settings> = {};
        if (settings.pushUserId !== result.identity.userId) {
          nextSettingsPatch.pushUserId = result.identity.userId;
        }
        if (settings.pushDeviceId !== result.identity.deviceId) {
          nextSettingsPatch.pushDeviceId = result.identity.deviceId;
        }
        if (settings.pushLastEndpoint !== result.endpoint) {
          nextSettingsPatch.pushLastEndpoint = result.endpoint;
        }
        if (settings.pushLastSyncedAt !== result.syncedAt) {
          nextSettingsPatch.pushLastSyncedAt = result.syncedAt;
        }

        if (Object.keys(nextSettingsPatch).length > 0) {
          updateSettings(nextSettingsPatch);
        }
      } catch (error) {
        console.warn('[WebPush] Auto sync failed:', error);
      }
    };

    void syncPushSubscription();
    return () => {
      cancelled = true;
    };
  }, [
    settings.pushEnabled,
    settings.pushServerBaseUrl,
    settings.pushUserId,
    settings.pushDeviceId,
    updateSettings,
  ]);

  // 壁纸 URL：优先使用用户设置的壁纸，否则使用默认壁纸
  const wallpaperUrl = settings.wallpaper || DEFAULT_WALLPAPER;

  const computedPageCount = Math.max(pageCount, items.reduce((max, item) => Math.max(max, item.page ?? 0), 0) + 1);

  // 当前页的桌面项目
  const currentPageItems = items.filter(item => item.page === activePage);

  // 分离 App 和 Widget
  const appItems = currentPageItems.filter(item => item.type === 'app');
  const widgetItems = currentPageItems.filter(item => item.type === 'widget');
  const customDesktopWidgets = useMemo(
    () => {
      const seen = new Set<string>();
      const savedWidgets = [...(desktopLayout.customWidgets || []), ...localCustomWidgets].map((widget) => ({
        instanceId: `library:${widget.id}`,
        name: getCustomWidgetDisplayName({ name: widget.name, widgetCode: widget.widgetCode }),
        width: widget.width || 2,
        height: widget.height || 2,
        data: {
          ...(widget.data || {}),
          name: widget.name,
          templateId: widget.templateId || 'custom-code',
          widgetCode: widget.widgetCode,
          cornerRadius: widget.cornerRadius,
          frosted: widget.frosted,
          shadow: widget.shadow,
        },
      }));
      savedWidgets.forEach((widget) => {
        seen.add(`${widget.name}::${String(widget.data.widgetCode || '')}`);
      });
      const legacyWidgets = items
        .filter((item) => {
          if (
            item.type !== 'widget' ||
            item.componentId !== 'custom-widget' ||
            item.data?.templateId !== 'custom-code' ||
            typeof item.data?.widgetCode !== 'string' ||
            item.data.widgetCode.trim().length === 0
          ) {
            return false;
          }
          const displayName = getCustomWidgetDisplayName(item.data);
          const key = `${displayName}::${item.data.widgetCode.trim()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((item) => ({
          instanceId: item.instanceId,
          name: getCustomWidgetDisplayName(item.data),
          width: item.w || 2,
          height: item.h || 2,
          data: item.data || {},
        }));
      return [...savedWidgets, ...legacyWidgets];
    },
    [desktopLayout.customWidgets, items, localCustomWidgets]
  );

  // 创建位置映射，用于按 x,y 坐标定位项目
  const appPositionMap = new Map<string, typeof appItems[0]>();
  appItems.forEach(item => {
    appPositionMap.set(`${item.x},${item.y}`, item);
  });

  const widgetPositionMap = new Map<string, typeof widgetItems[0]>();
  widgetItems.forEach(item => {
    widgetPositionMap.set(`${item.x},${item.y}`, item);
  });

  // 检查某个位置是否被 widget 占据（用于判断 widget 占用范围）
  const isOccupiedByWidget = (x: number, y: number) => {
    return widgetItems.some(w => x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h);
  };

  const showFullscreenHint = (message: string) => {
    setFullscreenHint(message);
    if (fullscreenHintTimerRef.current !== null) {
      window.clearTimeout(fullscreenHintTimerRef.current);
    }
    fullscreenHintTimerRef.current = window.setTimeout(() => {
      setFullscreenHint(null);
      fullscreenHintTimerRef.current = null;
    }, 4200);
  };

  useEffect(() => {
    return () => {
      if (fullscreenHintTimerRef.current !== null) {
        window.clearTimeout(fullscreenHintTimerRef.current);
      }
      if (iconLongPressTimerRef.current !== null) {
        window.clearTimeout(iconLongPressTimerRef.current);
      }
      if (desktopAutoPageTimerRef.current !== null) {
        window.clearTimeout(desktopAutoPageTimerRef.current);
      }
    };
  }, []);

  const clearIconLongPress = useCallback(() => {
    if (iconLongPressTimerRef.current !== null) {
      window.clearTimeout(iconLongPressTimerRef.current);
      iconLongPressTimerRef.current = null;
    }
    iconLongPressStartRef.current = null;
  }, []);

  const clearDesktopAutoPageTimer = useCallback(() => {
    if (desktopAutoPageTimerRef.current !== null) {
      window.clearTimeout(desktopAutoPageTimerRef.current);
      desktopAutoPageTimerRef.current = null;
    }
    desktopAutoPageTargetRef.current = null;
  }, []);

  const resolveCellFromPointer = useCallback((clientX: number, clientY: number) => {
    const grid = desktopGridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const col = Math.max(0, Math.min(cols - 1, Math.floor(((clientX - rect.left) / rect.width) * cols)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor(((clientY - rect.top) / rect.height) * rows)));
    return { x: col, y: row };
  }, [cols, rows]);

  const resolveWidgetCellFromPointer = useCallback((
    clientX: number,
    clientY: number,
    pointerOffsetX: number,
    pointerOffsetY: number,
    width: number,
    height: number
  ) => {
    const grid = desktopGridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const cellWidth = rect.width / cols;
    const cellHeight = rect.height / rows;
    const left = clientX - pointerOffsetX;
    const top = clientY - pointerOffsetY;
    const x = Math.max(0, Math.min(cols - width, Math.round((left - rect.left) / cellWidth)));
    const y = Math.max(0, Math.min(rows - height, Math.round((top - rect.top) / cellHeight)));
    return { x, y };
  }, [cols, rows]);

  const resolveIconCellFromPointer = useCallback((clientX: number, clientY: number, pointerOffsetX: number, pointerOffsetY: number) => {
    const grid = desktopGridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const cellWidth = rect.width / cols;
    const cellHeight = rect.height / rows;
    const centerX = clientX - pointerOffsetX;
    const centerY = clientY - pointerOffsetY;
    const x = Math.max(0, Math.min(cols - 1, Math.floor((centerX - rect.left) / cellWidth)));
    const y = Math.max(0, Math.min(rows - 1, Math.floor((centerY - rect.top) / cellHeight)));
    return { x, y };
  }, [cols, rows]);

  const isCellBlockedByWidget = useCallback((x: number, y: number) => (
    widgetItems.some((widget) => x >= widget.x && x < widget.x + widget.w && y >= widget.y && y < widget.y + widget.h)
  ), [widgetItems]);

  const moveDesktopAppToCell = useCallback((instanceId: string, targetX: number, targetY: number) => {
    const source = items.find((item) => item.instanceId === instanceId);
    if (!source || source.type !== 'app') return;
    if (isCellBlockedByWidget(targetX, targetY)) return;

    const occupied = items.find((item) => (
      item.type === 'app' &&
      item.instanceId !== instanceId &&
      (item.page ?? 0) === activePage &&
      item.x === targetX &&
      item.y === targetY
    ));
    if (occupied) {
      updateDesktopItem(occupied.instanceId, {
        page: source.page ?? 0,
        x: source.x,
        y: source.y,
      });
    }
    updateDesktopItem(instanceId, { page: activePage, x: targetX, y: targetY });
  }, [activePage, isCellBlockedByWidget, items, updateDesktopItem]);

  const addDesktopWidgetSize = useCallback((size: typeof desktopWidgetSizes[number]) => {
    const widgetsOnly = items.filter((item) => item.type === 'widget');
    const slot = findNextWidgetSlot(widgetsOnly, rows, cols, size.w, size.h);
    const widgetBlockers = [
      ...widgetsOnly,
      {
        instanceId: '__new-widget__',
        componentId: 'custom-widget',
        type: 'widget' as const,
        page: slot.page,
        x: slot.x,
        y: slot.y,
        w: size.w,
        h: size.h,
      },
    ];
    const movedApps = new Set<string>();
    const nextAppItems = items
      .filter((item) => item.type === 'app')
      .map((item) => ({ ...item }));

    const appOverlapsWidget = (app: DesktopItem) => (
      app.page === slot.page &&
      app.x < slot.x + size.w &&
      app.x + (app.w || 1) > slot.x &&
      app.y < slot.y + size.h &&
      app.y + (app.h || 1) > slot.y
    );
    const isCellFreeForApp = (page: number, x: number, y: number, movingInstanceId: string) => {
      const occupiedByWidget = widgetBlockers.some((widget) => {
        if ((widget.page ?? 0) !== page) return false;
        return x >= widget.x && x < widget.x + (widget.w || 1) && y >= widget.y && y < widget.y + (widget.h || 1);
      });
      if (occupiedByWidget) return false;
      return !nextAppItems.some((app) => (
        app.instanceId !== movingInstanceId &&
        (app.page ?? 0) === page &&
        app.x === x &&
        app.y === y
      ));
    };
    const findNextAppCell = (movingInstanceId: string) => {
      const maxPage = Math.max(slot.page, computedPageCount - 1);
      for (let page = slot.page; page <= maxPage + 1; page += 1) {
        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < cols; x += 1) {
            if (isCellFreeForApp(page, x, y, movingInstanceId)) {
              return { page, x, y };
            }
          }
        }
      }
      return { page: maxPage + 1, x: 0, y: 0 };
    };

    nextAppItems
      .filter(appOverlapsWidget)
      .forEach((app) => {
        const nextCell = findNextAppCell(app.instanceId);
        app.page = nextCell.page;
        app.x = nextCell.x;
        app.y = nextCell.y;
        movedApps.add(app.instanceId);
      });

    nextAppItems.forEach((app) => {
      if (movedApps.has(app.instanceId)) {
        updateDesktopItem(app.instanceId, { page: app.page, x: app.x, y: app.y });
      }
    });

    if (slot.page >= computedPageCount) {
      updateDesktopLayout({ pageCount: slot.page + 1 });
    }
    addDesktopItem({
      componentId: 'custom-widget',
      type: 'widget',
      page: slot.page,
      x: slot.x,
      y: slot.y,
      w: size.w,
      h: size.h,
      data: {
        name: `${size.label} 类型框`,
        templateId: 'glass-frame',
        subtitle: '半透明白色玻璃感类型框',
        backgroundImage: '',
        cornerRadius: 24,
        frosted: 10,
        shadow: 10,
        titleColor: '#ffffff',
        titleFontSize: 24,
      },
    });
    setActivePage(slot.page);
    setIsDesktopWidgetPickerOpen(false);
    setIsDesktopEditMenuOpen(false);
  }, [addDesktopItem, cols, computedPageCount, items, rows, updateDesktopItem, updateDesktopLayout]);

  const convertDesktopWidgetFrame = useCallback((instanceId: string, templateId: string) => {
    const template = desktopFrameWidgetTemplates.find((item) => item.id === templateId);
    if (!template) return;
    const defaultsByTemplate: Record<string, Record<string, unknown>> = {
      'ins-photo': {
        subtitle: '点击上传照片',
        backgroundImage: '',
        cornerRadius: 22,
        frosted: 8,
        shadow: 12,
      },
      'calendar-card': {
        subtitle: 'February',
        backgroundImage: '',
        cornerRadius: 22,
        frosted: 6,
        shadow: 12,
      },
      'vinyl-record': {
        subtitle: 'SCION MANIA',
        backgroundImage: '',
        cornerRadius: 22,
        frosted: 6,
        shadow: 12,
        musicPlaying: false,
        musicTitle: 'SCION',
        musicArtist: 'MANIA',
      },
      'clock-card': {
        subtitle: 'Thu Mar 26',
        cornerRadius: 18,
        frosted: 4,
        shadow: 8,
      },
      'text-card': {
        titleText: '184 天',
        subtitle: '我们的纪念日\n2024.07.30',
        titleColor: '#ffffff',
        titleFontSize: 22,
        cornerRadius: 20,
        frosted: 8,
        shadow: 10,
      },
    };
    updateDesktopItem(instanceId, {
      data: {
        name: template.name,
        templateId,
        ...defaultsByTemplate[templateId],
      },
    });
    setActiveWidgetFrameMenuId(null);
  }, [updateDesktopItem]);

  const convertDesktopWidgetFrameToCustom = useCallback((instanceId: string, widget: typeof customDesktopWidgets[number]) => {
    updateDesktopItem(instanceId, {
      data: {
        ...widget.data,
        name: widget.name,
        templateId: 'custom-code',
      },
    });
    setActiveWidgetFrameMenuId(null);
  }, [updateDesktopItem]);

  const canPlaceDesktopWidgetFrame = useCallback((target: DesktopItem, x: number, y: number, width = target.w || 1, height = target.h || 1, page = activePage) => {
    if (x < 0 || y < 0 || x + width > cols || y + height > rows) return false;
    return !items.some((item) => {
      if (item.instanceId === target.instanceId || item.type !== 'widget' || (item.page ?? 0) !== page) return false;
      const itemWidth = item.w || 1;
      const itemHeight = item.h || 1;
      return x < item.x + itemWidth && x + width > item.x && y < item.y + itemHeight && y + height > item.y;
    });
  }, [activePage, cols, items, rows]);

  const moveAppsAwayFromWidgetFrame = useCallback((target: DesktopItem, x: number, y: number, width = target.w || 1, height = target.h || 1, page = activePage) => {
    const widgetBlockers = [
      ...items.filter((item) => item.type === 'widget' && item.instanceId !== target.instanceId),
      { ...target, page, x, y, w: width, h: height },
    ];
    const nextAppItems = items
      .filter((item) => item.type === 'app')
      .map((item) => ({ ...item }));
    const movedApps = new Set<string>();
    const overlapsTarget = (app: DesktopItem) => (
      (app.page ?? 0) === page &&
      app.x < x + width &&
      app.x + (app.w || 1) > x &&
      app.y < y + height &&
      app.y + (app.h || 1) > y
    );
    const isCellFreeForApp = (page: number, cellX: number, cellY: number, movingInstanceId: string) => {
      const occupiedByWidget = widgetBlockers.some((widget) => (
        (widget.page ?? 0) === page &&
        cellX >= widget.x &&
        cellX < widget.x + (widget.w || 1) &&
        cellY >= widget.y &&
        cellY < widget.y + (widget.h || 1)
      ));
      if (occupiedByWidget) return false;
      return !nextAppItems.some((app) => (
        app.instanceId !== movingInstanceId &&
        (app.page ?? 0) === page &&
        app.x === cellX &&
        app.y === cellY
      ));
    };
    const findNextAppCell = (movingInstanceId: string) => {
      const maxPage = Math.max(page, computedPageCount - 1);
      for (let nextPage = page; nextPage <= maxPage + 1; nextPage += 1) {
        for (let nextY = 0; nextY < rows; nextY += 1) {
          for (let nextX = 0; nextX < cols; nextX += 1) {
            if (isCellFreeForApp(nextPage, nextX, nextY, movingInstanceId)) {
              return { page: nextPage, x: nextX, y: nextY };
            }
          }
        }
      }
      return { page: maxPage + 1, x: 0, y: 0 };
    };

    nextAppItems
      .filter(overlapsTarget)
      .sort((left, right) => {
        const leftPage = left.page ?? 0;
        const rightPage = right.page ?? 0;
        if (leftPage !== rightPage) return leftPage - rightPage;
        return left.y * cols + left.x - (right.y * cols + right.x);
      })
      .forEach((app) => {
        const nextCell = findNextAppCell(app.instanceId);
        app.page = nextCell.page;
        app.x = nextCell.x;
        app.y = nextCell.y;
        movedApps.add(app.instanceId);
      });

    nextAppItems.forEach((app) => {
      if (movedApps.has(app.instanceId)) {
        updateDesktopItem(app.instanceId, { page: app.page, x: app.x, y: app.y });
      }
    });
  }, [activePage, cols, computedPageCount, items, rows, updateDesktopItem]);

  const compactDesktopAppsAfterWidgetResize = useCallback((fromPage: number) => {
    const latestItems = useDesktopCoreStore.getState().desktopLayout.items || [];
    const appItemsToCompact = latestItems
      .filter((item) => item.type === 'app' && (item.page ?? 0) >= fromPage)
      .map((item) => ({ ...item }))
      .sort((left, right) => {
        const leftPage = left.page ?? 0;
        const rightPage = right.page ?? 0;
        if (leftPage !== rightPage) return leftPage - rightPage;
        return left.y * cols + left.x - (right.y * cols + right.x);
      });
    if (appItemsToCompact.length === 0) return;

    const widgetBlockers = latestItems.filter((item) => item.type === 'widget');
    const occupiedAppCells = new Set<string>();
    const maxPage = Math.max(
      computedPageCount - 1,
      fromPage,
      ...latestItems.map((item) => item.page ?? 0)
    );
    const isBlockedByWidget = (page: number, x: number, y: number) => (
      widgetBlockers.some((widget) => (
        (widget.page ?? 0) === page &&
        x >= widget.x &&
        x < widget.x + (widget.w || 1) &&
        y >= widget.y &&
        y < widget.y + (widget.h || 1)
      ))
    );
    const findNextCell = () => {
      for (let page = fromPage; page <= maxPage + 1; page += 1) {
        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < cols; x += 1) {
            const key = `${page}:${x}:${y}`;
            if (!occupiedAppCells.has(key) && !isBlockedByWidget(page, x, y)) {
              occupiedAppCells.add(key);
              return { page, x, y };
            }
          }
        }
      }
      const fallback = { page: maxPage + 1, x: 0, y: 0 };
      occupiedAppCells.add(`${fallback.page}:0:0`);
      return fallback;
    };

    appItemsToCompact.forEach((app) => {
      const nextCell = findNextCell();
      if ((app.page ?? 0) !== nextCell.page || app.x !== nextCell.x || app.y !== nextCell.y) {
        updateDesktopItem(app.instanceId, nextCell);
      }
    });
  }, [cols, computedPageCount, rows, updateDesktopItem]);

  const scheduleDesktopAutoPage = useCallback((clientX: number) => {
    const hasDrag = Boolean(iconDragRef.current || widgetDragRef.current);
    if (!hasDrag) return;

    const edgeZone = 42;
    const viewportWidth = window.innerWidth;
    const targetPage =
      clientX > viewportWidth - edgeZone
        ? activePage + 1
        : clientX < edgeZone
          ? activePage - 1
          : null;

    if (targetPage === null || targetPage < 0) {
      clearDesktopAutoPageTimer();
      return;
    }

    const maxTargetPage = computedPageCount;
    if (targetPage > maxTargetPage) {
      clearDesktopAutoPageTimer();
      return;
    }

    if (desktopAutoPageTargetRef.current === targetPage && desktopAutoPageTimerRef.current !== null) {
      return;
    }

    clearDesktopAutoPageTimer();
    desktopAutoPageTargetRef.current = targetPage;
    desktopAutoPageTimerRef.current = window.setTimeout(() => {
      if (!iconDragRef.current && !widgetDragRef.current) {
        clearDesktopAutoPageTimer();
        return;
      }
      if (targetPage >= computedPageCount) {
        updateDesktopLayout({ pageCount: targetPage + 1 });
      }
      setActivePage(targetPage);
      clearDesktopAutoPageTimer();
    }, 360);
  }, [activePage, clearDesktopAutoPageTimer, computedPageCount, updateDesktopLayout]);

  const startDesktopWidgetPointer = useCallback((event: React.PointerEvent<HTMLDivElement>, item: DesktopItem) => {
    if (event.button !== 0) return;
    event.stopPropagation();

    if (!isDesktopEditing) {
      clearIconLongPress();
      iconLongPressStartRef.current = { x: event.clientX, y: event.clientY };
      iconLongPressTimerRef.current = window.setTimeout(() => {
        setIsDesktopEditing(true);
        iconLongPressTimerRef.current = null;
        iconLongPressStartRef.current = null;
      }, 520);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('button, input, label, textarea, select')) return;

    const rect = event.currentTarget.getBoundingClientRect();
    widgetDragRef.current = {
      pointerId: event.pointerId,
      instanceId: item.instanceId,
      startX: event.clientX,
      startY: event.clientY,
      sourcePage: item.page ?? activePage,
      pointerOffsetX: event.clientX - rect.left,
      pointerOffsetY: event.clientY - rect.top,
      moved: false,
    };
    widgetClickSuppressRef.current = false;
    if (item.data?.templateId !== 'glass-frame') {
      setActiveWidgetFrameMenuId(null);
    }
    setDraggingDesktopWidget({
      instanceId: item.instanceId,
      dx: 0,
      dy: 0,
      clientX: event.clientX,
      clientY: event.clientY,
      sourcePage: item.page ?? activePage,
      pointerOffsetX: event.clientX - rect.left,
      pointerOffsetY: event.clientY - rect.top,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [activePage, clearIconLongPress, isDesktopEditing]);

  const moveDesktopWidgetPointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDesktopEditing) {
      const start = iconLongPressStartRef.current;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
        clearIconLongPress();
      }
      return;
    }
    const drag = widgetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 6) {
      drag.moved = true;
      widgetClickSuppressRef.current = true;
    }
    setDraggingDesktopWidget({
      instanceId: drag.instanceId,
      dx,
      dy,
      clientX: event.clientX,
      clientY: event.clientY,
      sourcePage: drag.sourcePage,
      pointerOffsetX: drag.pointerOffsetX,
      pointerOffsetY: drag.pointerOffsetY,
    });
    scheduleDesktopAutoPage(event.clientX);
  }, [clearIconLongPress, isDesktopEditing, scheduleDesktopAutoPage]);

  const endDesktopWidgetPointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDesktopEditing) {
      clearIconLongPress();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }
    const drag = widgetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const item = items.find((entry) => entry.instanceId === drag.instanceId);
    const cell = item
      ? resolveWidgetCellFromPointer(
          event.clientX,
          event.clientY,
          drag.pointerOffsetX,
          drag.pointerOffsetY,
          item.w || 1,
          item.h || 1
        )
      : null;
    widgetDragRef.current = null;
    setDraggingDesktopWidget(null);
    if (item && cell && canPlaceDesktopWidgetFrame(item, cell.x, cell.y)) {
      moveAppsAwayFromWidgetFrame(item, cell.x, cell.y);
      updateDesktopItem(item.instanceId, { x: cell.x, y: cell.y, page: activePage });
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [activePage, canPlaceDesktopWidgetFrame, clearIconLongPress, isDesktopEditing, items, moveAppsAwayFromWidgetFrame, resolveWidgetCellFromPointer, updateDesktopItem]);

  const startDesktopWidgetResize = useCallback((event: React.PointerEvent<HTMLButtonElement>, item: DesktopItem) => {
    if (!isDesktopEditing || event.button !== 0) return;
    event.stopPropagation();
    setActiveWidgetFrameMenuId(null);
    widgetResizeRef.current = {
      pointerId: event.pointerId,
      instanceId: item.instanceId,
      startX: event.clientX,
      startY: event.clientY,
      startW: item.w || 1,
      startH: item.h || 1,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [isDesktopEditing]);

  const moveDesktopWidgetResize = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const resize = widgetResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const item = items.find((entry) => entry.instanceId === resize.instanceId);
    const grid = desktopGridRef.current;
    if (!item || !grid) return;
    const rect = grid.getBoundingClientRect();
    const cellWidth = rect.width / cols;
    const cellHeight = rect.height / rows;
    const nextW = Math.max(1, Math.min(cols - item.x, Math.round(resize.startW + (event.clientX - resize.startX) / cellWidth)));
    const nextH = Math.max(1, Math.min(rows - item.y, Math.round(resize.startH + (event.clientY - resize.startY) / cellHeight)));
    if (canPlaceDesktopWidgetFrame(item, item.x, item.y, nextW, nextH)) {
      moveAppsAwayFromWidgetFrame(item, item.x, item.y, nextW, nextH);
      updateDesktopItem(item.instanceId, { w: nextW, h: nextH });
    }
  }, [canPlaceDesktopWidgetFrame, cols, items, moveAppsAwayFromWidgetFrame, rows, updateDesktopItem]);

  const endDesktopWidgetResize = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const resize = widgetResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    widgetResizeRef.current = null;
    compactDesktopAppsAfterWidgetResize(activePage);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [activePage, compactDesktopAppsAfterWidgetResize]);

  const startDesktopIconPointer = useCallback((
    event: React.PointerEvent<HTMLDivElement>,
    item: DesktopItem
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();

    if (!isDesktopEditing) {
      clearIconLongPress();
      iconLongPressStartRef.current = { x: event.clientX, y: event.clientY };
      iconLongPressTimerRef.current = window.setTimeout(() => {
        setIsDesktopEditing(true);
        iconLongPressTimerRef.current = null;
        iconLongPressStartRef.current = null;
      }, 520);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerOffsetX = event.clientX - (rect.left + rect.width / 2);
    const pointerOffsetY = event.clientY - (rect.top + rect.height / 2);
    iconDragRef.current = {
      pointerId: event.pointerId,
      instanceId: item.instanceId,
      startX: event.clientX,
      startY: event.clientY,
      originX: item.x,
      originY: item.y,
      sourcePage: item.page ?? activePage,
      pointerOffsetX,
      pointerOffsetY,
      moved: false,
    };
    setDraggingDesktopIcon({
      instanceId: item.instanceId,
      dx: 0,
      dy: 0,
      clientX: event.clientX,
      clientY: event.clientY,
      sourcePage: item.page ?? activePage,
      pointerOffsetX,
      pointerOffsetY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [activePage, clearIconLongPress, isDesktopEditing]);

  const moveDesktopIconPointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDesktopEditing) {
      const start = iconLongPressStartRef.current;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
        clearIconLongPress();
      }
      return;
    }

    const drag = iconDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 6) {
      drag.moved = true;
    }
    setDraggingDesktopIcon({
      instanceId: drag.instanceId,
      dx,
      dy,
      clientX: event.clientX,
      clientY: event.clientY,
      sourcePage: drag.sourcePage,
      pointerOffsetX: drag.pointerOffsetX,
      pointerOffsetY: drag.pointerOffsetY,
    });
    scheduleDesktopAutoPage(event.clientX);
  }, [clearIconLongPress, isDesktopEditing, scheduleDesktopAutoPage]);

  const endDesktopIconPointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDesktopEditing) {
      clearIconLongPress();
      return;
    }

    const drag = iconDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const targetCell = resolveIconCellFromPointer(event.clientX, event.clientY, drag.pointerOffsetX, drag.pointerOffsetY);
    clearDesktopAutoPageTimer();
    iconDragRef.current = null;
    setDraggingDesktopIcon(null);
    if (targetCell) {
      moveDesktopAppToCell(drag.instanceId, targetCell.x, targetCell.y);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [clearDesktopAutoPageTimer, clearIconLongPress, isDesktopEditing, moveDesktopAppToCell, resolveIconCellFromPointer]);

  useEffect(() => {
    if (!isDesktopEditing) return;

    const handlePointerMove = (event: PointerEvent) => {
      const iconDrag = iconDragRef.current;
      if (iconDrag && iconDrag.pointerId === event.pointerId) {
        const dx = event.clientX - iconDrag.startX;
        const dy = event.clientY - iconDrag.startY;
        if (Math.hypot(dx, dy) > 6) {
          iconDrag.moved = true;
        }
        setDraggingDesktopIcon({
          instanceId: iconDrag.instanceId,
          dx,
          dy,
          clientX: event.clientX,
          clientY: event.clientY,
          sourcePage: iconDrag.sourcePage,
          pointerOffsetX: iconDrag.pointerOffsetX,
          pointerOffsetY: iconDrag.pointerOffsetY,
        });
        scheduleDesktopAutoPage(event.clientX);
        return;
      }

      const widgetDrag = widgetDragRef.current;
      if (!widgetDrag || widgetDrag.pointerId !== event.pointerId) return;
      const dx = event.clientX - widgetDrag.startX;
      const dy = event.clientY - widgetDrag.startY;
      if (Math.hypot(dx, dy) > 6) {
        widgetDrag.moved = true;
        widgetClickSuppressRef.current = true;
      }
      setDraggingDesktopWidget({
        instanceId: widgetDrag.instanceId,
        dx,
        dy,
        clientX: event.clientX,
        clientY: event.clientY,
        sourcePage: widgetDrag.sourcePage,
        pointerOffsetX: widgetDrag.pointerOffsetX,
        pointerOffsetY: widgetDrag.pointerOffsetY,
      });
      scheduleDesktopAutoPage(event.clientX);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const iconDrag = iconDragRef.current;
      if (iconDrag && iconDrag.pointerId === event.pointerId) {
        const targetCell = resolveIconCellFromPointer(event.clientX, event.clientY, iconDrag.pointerOffsetX, iconDrag.pointerOffsetY);
        clearDesktopAutoPageTimer();
        iconDragRef.current = null;
        setDraggingDesktopIcon(null);
        if (targetCell) {
          moveDesktopAppToCell(iconDrag.instanceId, targetCell.x, targetCell.y);
        }
        return;
      }

      const widgetDrag = widgetDragRef.current;
      if (!widgetDrag || widgetDrag.pointerId !== event.pointerId) return;
      const item = items.find((entry) => entry.instanceId === widgetDrag.instanceId);
      const cell = item
        ? resolveWidgetCellFromPointer(
            event.clientX,
            event.clientY,
            widgetDrag.pointerOffsetX,
            widgetDrag.pointerOffsetY,
            item.w || 1,
            item.h || 1
          )
        : null;
      clearDesktopAutoPageTimer();
      widgetDragRef.current = null;
      setDraggingDesktopWidget(null);
      if (item && cell && canPlaceDesktopWidgetFrame(item, cell.x, cell.y, item.w || 1, item.h || 1, activePage)) {
        moveAppsAwayFromWidgetFrame(item, cell.x, cell.y, item.w || 1, item.h || 1, activePage);
        updateDesktopItem(item.instanceId, { x: cell.x, y: cell.y, page: activePage });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [
    clearDesktopAutoPageTimer,
    activePage,
    canPlaceDesktopWidgetFrame,
    isDesktopEditing,
    items,
    moveDesktopAppToCell,
    moveAppsAwayFromWidgetFrame,
    resolveIconCellFromPointer,
    resolveWidgetCellFromPointer,
    scheduleDesktopAutoPage,
    updateDesktopItem,
  ]);

  const uninstallDesktopApp = useCallback((item: DesktopItem) => {
    if (isSystemAppId(item.componentId)) return;
    const app = desktopAppMap.get(item.componentId);
    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm(`确认卸载「${app?.name || '该应用'}」吗？`);
    if (!confirmed) return;
    uninstallApp(item.componentId);
    removeDesktopItem(item.instanceId);
  }, [desktopAppMap, removeDesktopItem, uninstallApp]);

  const toggleFullscreen = async () => {
    const doc = document as FullscreenDocument;
    const docEl = document.documentElement as FullscreenElement;
    const canUseNativeFullscreen = supportsFullscreenRequest(docEl);

    try {
      if (isFullscreenActive(doc)) {
        await exitBrowserFullscreen(doc);
        setIsFullscreen(isFullscreenActive(doc));
        return;
      }

      if (canUseNativeFullscreen) {
        await requestBrowserFullscreen(docEl);
        setIsFullscreen(isFullscreenActive(doc));
        return;
      }

      if (isIOSDevice() && isSafariBrowser()) {
        if (isStandaloneDisplayMode()) {
          showFullscreenHint('已是独立模式。iOS 系统状态栏不可完全隐藏，但不会再显示应用内模拟状态栏。');
        } else {
          showFullscreenHint('Safari 不支持网页原生全屏。请点“分享”→“添加到主屏幕”，再从桌面打开。');
        }
        return;
      }

      showFullscreenHint('当前浏览器不支持网页全屏 API。');
    } catch (error) {
      console.warn('[Fullscreen] Toggle failed:', error);
      if (isIOSDevice() && isSafariBrowser()) {
        showFullscreenHint('Safari 对网页全屏支持有限，建议添加到主屏幕后使用。');
      } else {
        showFullscreenHint('进入全屏失败，请重试或更换支持的浏览器。');
      }
    }
  };

  useEffect(() => {
    if (desktopLayout.pageCount !== computedPageCount) {
      updateDesktopLayout({ pageCount: computedPageCount });
    }
    if (activePage >= computedPageCount) {
      setActivePage(Math.max(computedPageCount - 1, 0));
    }
  }, [computedPageCount, desktopLayout.pageCount, updateDesktopLayout, activePage]);

  useEffect(() => {
    if (!isDesktopEditing) {
      setIsDesktopEditMenuOpen(false);
      setIsDesktopWidgetPickerOpen(false);
    }
  }, [isDesktopEditing]);

  return (
    <div
      className="fixed left-0 right-0 top-0 bg-white overflow-hidden flex flex-col"
      style={{ height: 'var(--app-physical-height, var(--app-dvh, 100dvh))' }}
    >
      {activeAppId !== 'dreammusic' ? <DreamMusicAudioHost /> : null}
      <AnimatePresence>{isBooting && <SystemBootScreen version={__APP_VERSION__} />}</AnimatePresence>

      <AnimatePresence>
        {isLocked && <LockScreen onUnlock={() => setIsLocked(false)} />}
      </AnimatePresence>

      {/* 动态渲染激活的应用 */}
      <AnimatePresence>
        {activeAppId && ActiveAppComponent && (
          <ActiveAppComponent onClose={closeActiveApp} context={activeAppContext} />
        )}
        {activeAppId && !ActiveAppComponent && activeRuntimeApp && (
          <HtmlRuntimeApp
            name={activeRuntimeApp.name}
            html={activeRuntimeApp.html}
            onClose={closeActiveApp}
          />
        )}
      </AnimatePresence>

      {/* 壁纸 */}
      <div className="absolute inset-0 z-0 bg-white">
        <img
          src={wallpaperUrl}
          alt="Wallpaper"
          className="w-full h-full object-cover"
          style={{ opacity: (settings.wallpaperOpacity || 80) / 100 }}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-blue-400/10" />
      </div>

      {/* Status Bar */}
      {shouldRenderCustomStatusBar && (
        <StatusBar dark={true} isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />
      )}

      <AnimatePresence>
        {fullscreenHint && (
          <motion.div
            key="fullscreen-hint"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-none absolute left-1/2 z-[70] w-[min(90vw,360px)] -translate-x-1/2 rounded-2xl bg-black/55 px-4 py-3 text-center text-[13px] leading-5 text-white shadow-lg backdrop-blur-xl"
            style={{
              top: shouldRenderCustomStatusBar
                ? 'max(env(safe-area-inset-top, 0px), 56px)'
                : 'max(env(safe-area-inset-top, 0px), 12px)',
            }}
          >
            {fullscreenHint}
          </motion.div>
        )}
      </AnimatePresence>

      {!activeAppId && isDesktopEditing && (
        <div
          className="pointer-events-none absolute inset-x-0 z-[70] flex items-start justify-between px-8"
          style={{
            top: shouldRenderCustomStatusBar
              ? 'calc(max(env(safe-area-inset-top, 0px), 24px) + 8px)'
              : 'calc(max(env(safe-area-inset-top, 0px), 12px) + 4px)',
          }}
        >
          <div className="pointer-events-auto relative">
            <button
              type="button"
              className="h-7 rounded-full border border-white/60 bg-white/12 px-4 text-[12px] font-semibold text-white/100 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_6px_18px_rgba(15,23,42,0.10)] backdrop-blur-xl"
              onClick={() => setIsDesktopEditMenuOpen((open) => !open)}
            >
              编辑
            </button>
            <AnimatePresence>
              {isDesktopEditMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute left-0 top-10 overflow-hidden rounded-[26px] border border-white/35 px-4 py-3 text-white ${
                    isDesktopWidgetPickerOpen ? 'w-[min(82vw,300px)]' : 'w-[min(58vw,220px)]'
                  }`}
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.035) 46%, rgba(255,255,255,0.10))',
                    backdropFilter: 'blur(10px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                    boxShadow:
                      'inset 0 1px 1px rgba(255,255,255,0.42), inset 0 -1px 1px rgba(255,255,255,0.16), inset 1px 0 0 rgba(255,255,255,0.22), inset -1px 0 0 rgba(125,211,252,0.18), 0 16px 42px rgba(15,23,42,0.16)',
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-[26px] bg-gradient-to-br from-white/14 via-transparent to-white/6" />
                  {isDesktopWidgetPickerOpen ? (
                    <div className="relative">
                      <div className="mb-4 flex items-center justify-between gap-3 text-left text-[12px] font-semibold leading-none text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]">
                        <button
                          type="button"
                          className="text-white/85"
                          onClick={() => setIsDesktopWidgetPickerOpen(false)}
                        >
                          添加小组件
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {desktopWidgetSizes.map((size) => (
                          <button
                            key={size.label}
                            type="button"
                            className="flex h-[78px] flex-col items-center justify-center gap-2 rounded-[16px] border border-white/24 bg-white/8 text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                            onClick={() => addDesktopWidgetSize(size)}
                          >
                            <span
                              className="rounded-[5px] border border-white/20 bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
                              style={{
                                width: `${Math.max(12, size.w * 14)}px`,
                                height: `${Math.max(12, size.h * 12)}px`,
                              }}
                            />
                            <span>{size.label} 类型</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    [
                      {
                        label: '添加小组件',
                        icon: Grid2x2Plus,
                        onClick: () => setIsDesktopWidgetPickerOpen(true),
                      },
                      {
                        label: '自定义',
                        icon: Palette,
                        onClick: () => undefined,
                      },
                      {
                        label: '编辑墙纸',
                        icon: Wallpaper,
                        onClick: () => openAppFromDesktopEditMenu('settings', { initialView: 'themeManage' }),
                      },
                    ].map((item) => {
                      const MenuIcon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          className="relative flex w-full items-center gap-3 py-2.5 text-left text-[12px] font-semibold leading-none text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]"
                          onClick={item.onClick}
                        >
                          <MenuIcon size={16} strokeWidth={1.9} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            className="pointer-events-auto h-7 rounded-full border border-white/60 bg-white/12 px-4 text-[12px] font-semibold text-white/100 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_6px_18px_rgba(15,23,42,0.10)] backdrop-blur-xl"
            onClick={() => {
              setIsDesktopEditMenuOpen(false);
              setIsDesktopEditing(false);
            }}
          >
            完成
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 z-10 overflow-y-auto ${isDenseGrid ? 'px-3' : 'px-6'}`}
        style={{ 
          // ✨ 核心魔法：利用已有的 isIOSDevice() 动态判断系统，分配不同的 paddingTop
          paddingTop: isFullscreen 
            ? (isIOSDevice() ? '9rem' : '4rem')
            : (isIOSDevice() 
                ? 'calc(max(env(safe-area-inset-top, 24px), 24px) + 2.5rem)' // iOS：额外加 2.5rem，避开刘海/灵动岛，增加呼吸感
                : 'calc(max(env(safe-area-inset-top, 24px), 24px) + 0.5rem)'), // 安卓：只加 0.5rem，整体网格上提，紧凑自然
          // 底部保持一致，统一避开 Dock 栏
          paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 100px)'
        }}
        onTouchStart={(e) => {
          if (
            isDesktopEditing &&
            (iconDragRef.current ||
              widgetDragRef.current ||
              widgetResizeRef.current ||
              (e.target as HTMLElement).closest('[data-desktop-icon-id], [data-desktop-widget-id], button'))
          ) {
            touchStartRef.current = null;
            return;
          }
          const t = e.touches[0];
          if (!t) return;
          touchStartRef.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          if (iconDragRef.current || widgetDragRef.current || widgetResizeRef.current) {
            touchStartRef.current = null;
            return;
          }
          const start = touchStartRef.current;
          if (!start) return;
          const t = e.changedTouches[0];
          if (!t) return;
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          touchStartRef.current = null;
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
          if (dx < 0 && activePage < computedPageCount - 1) {
            setActivePage(activePage + 1);
          } else if (dx > 0 && activePage > 0) {
            setActivePage(activePage - 1);
          }
        }}
      >
        {/* 统一桌面网格 - Widget 和 App 在同一个 grid 中渲染 */}
        <div
          ref={desktopGridRef}
          className={`grid ${isDenseGrid ? 'gap-3' : 'gap-4'}`}
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: isDenseGrid ? 'minmax(52px, auto)' : 'minmax(60px, auto)' }}
        >
          {/* 遍历所有可能的网格位置 */}
          {(() => {
            const cells = [];
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                const key = `${col},${row}`;
                const widgetItem = widgetPositionMap.get(key);
                const appItem = appPositionMap.get(key);

                // 检查是否是 widget 的起始位置
                const isWidgetStart = widgetItem && widgetItem.x === col && widgetItem.y === row;
                // 检查是否是 widget 内部的某个位置（非起始位置）
                const isInsideWidget = widgetItem && !isWidgetStart && isOccupiedByWidget(col, row);

                if (isWidgetStart && widgetItem) {
                  // 渲染 Widget - 使用明确的 grid 位置
                  const widgetConfig = getWidgetById(widgetItem.componentId);
                  const w = widgetItem.w || widgetConfig?.defaultWidth || 2;
                  const h = widgetItem.h || widgetConfig?.defaultHeight || 2;
                  const gridColumnStart = widgetItem.x + 1;
                  const gridColumnEnd = gridColumnStart + w;
                  const gridRowStart = widgetItem.y + 1;
                  const gridRowEnd = gridRowStart + h;
                  const draggingOffset = draggingDesktopWidget?.instanceId === widgetItem.instanceId
                    ? draggingDesktopWidget
                    : null;
                  
                  cells.push(
                    <div
                      key={widgetItem.instanceId}
                      data-desktop-widget-id={widgetItem.instanceId}
                      style={{
                        gridColumn: `${gridColumnStart} / ${gridColumnEnd}`,
                        gridRow: `${gridRowStart} / ${gridRowEnd}`,
                        transform: draggingOffset
                          ? `translate3d(${draggingOffset.dx}px, ${draggingOffset.dy}px, 0)`
                          : undefined,
                        transition: draggingOffset
                          ? 'none'
                          : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
                        zIndex: draggingOffset ? 60 : undefined,
                      }}
                      className={`relative rounded-2xl touch-none ${isDesktopEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      onPointerDownCapture={(event) => {
                        if ((event.target as HTMLElement).closest('[data-custom-widget-press-layer]')) return;
                        if (!isDesktopEditing) startDesktopWidgetPointer(event, widgetItem);
                      }}
                      onPointerDown={(event) => {
                        if (isDesktopEditing) startDesktopWidgetPointer(event, widgetItem);
                      }}
                      onPointerMoveCapture={(event) => {
                        if (!isDesktopEditing) moveDesktopWidgetPointer(event);
                      }}
                      onPointerMove={(event) => {
                        if (isDesktopEditing) moveDesktopWidgetPointer(event);
                      }}
                      onPointerUpCapture={(event) => {
                        if (!isDesktopEditing) endDesktopWidgetPointer(event);
                      }}
                      onPointerUp={(event) => {
                        if (isDesktopEditing) endDesktopWidgetPointer(event);
                      }}
                      onPointerCancelCapture={(event) => {
                        if (!isDesktopEditing) endDesktopWidgetPointer(event);
                      }}
                      onPointerCancel={(event) => {
                        if (isDesktopEditing) endDesktopWidgetPointer(event);
                      }}
                      onClick={(event) => {
                        if (!isDesktopEditing || widgetItem.data?.templateId !== 'glass-frame') return;
                        event.stopPropagation();
                        if (widgetClickSuppressRef.current) {
                          widgetClickSuppressRef.current = false;
                          return;
                        }
                        setActiveWidgetFrameMenuId((prev) => (prev === widgetItem.instanceId ? null : widgetItem.instanceId));
                      }}
                    >
                      {isDesktopEditing ? (
                        <>
                          <button
                            type="button"
                            className="absolute left-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/45 bg-white/18 p-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_6px_14px_rgba(15,23,42,0.14)] backdrop-blur-xl"
                            aria-label="删除小组件"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeDesktopItem(widgetItem.instanceId);
                            }}
                          >
                            <span className="h-0.5 w-3.5 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.28)]" />
                          </button>
                          <button
                            type="button"
                            className="absolute bottom-1 right-1 z-20 h-5 w-5 rounded-full border border-white/45 bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_6px_14px_rgba(15,23,42,0.14)] backdrop-blur-xl"
                            aria-label="调整小组件大小"
                            onPointerDown={(event) => startDesktopWidgetResize(event, widgetItem)}
                            onPointerMove={moveDesktopWidgetResize}
                            onPointerUp={endDesktopWidgetResize}
                            onPointerCancel={endDesktopWidgetResize}
                          />
                        </>
                      ) : null}
                      <div className="h-full w-full overflow-hidden rounded-2xl">
                        {widgetConfig?.component ? (
                          <Widget
                            size={widgetItem.w && widgetItem.h ? `${widgetItem.w}x${widgetItem.h}` as any : 'medium'}
                            title={widgetConfig.name}
                          >
                            {React.createElement(widgetConfig.component, { ...widgetItem.data })}
                          </Widget>
                        ) : (
                          <WidgetPlaceholder
                            name={widgetItem.data?.name || widgetConfig?.name || 'Widget'}
                            backgroundImage={widgetItem.data?.backgroundImage || widgetItem.data?.placeholderIcon || ''}
                            defaultIcon={widgetConfig?.defaultIcon || ''}
                            status={widgetItem.componentId === 'custom-widget' ? 'normal' : 'building'}
                            cornerRadius={widgetItem.data?.cornerRadius}
                            frosted={widgetItem.data?.frosted}
                            shadow={widgetItem.data?.shadow}
                            templateId={typeof widgetItem.data?.templateId === 'string' ? widgetItem.data.templateId : undefined}
                            subtitle={typeof widgetItem.data?.subtitle === 'string' ? widgetItem.data.subtitle : undefined}
                            titleText={typeof widgetItem.data?.titleText === 'string' ? widgetItem.data.titleText : undefined}
                            titleColor={typeof widgetItem.data?.titleColor === 'string' ? widgetItem.data.titleColor : undefined}
                            titleFontSize={typeof widgetItem.data?.titleFontSize === 'number' ? widgetItem.data.titleFontSize : undefined}
                            widgetCode={typeof widgetItem.data?.widgetCode === 'string' ? widgetItem.data.widgetCode : undefined}
                            musicPlaying={typeof widgetItem.data?.musicPlaying === 'boolean' ? widgetItem.data.musicPlaying : undefined}
                            musicTitle={typeof widgetItem.data?.musicTitle === 'string' ? widgetItem.data.musicTitle : undefined}
                            musicArtist={typeof widgetItem.data?.musicArtist === 'string' ? widgetItem.data.musicArtist : undefined}
                            isEditing={isDesktopEditing}
                            onRequestDesktopEdit={() => setIsDesktopEditing(true)}
                            onUpdateData={(nextData) => updateDesktopItem(widgetItem.instanceId, {
                              data: {
                                ...widgetItem.data,
                                ...nextData,
                              },
                            })}
                            width={w}
                            height={h}
                          />
                        )}
                      </div>
                      {isDesktopEditing &&
                      widgetItem.data?.templateId === 'glass-frame' &&
                      activeWidgetFrameMenuId === widgetItem.instanceId ? (
                        <div
                          className="absolute left-1 top-8 z-30 w-[min(180px,calc(100vw-48px))] overflow-y-auto rounded-[18px] border border-white/35 bg-white/18 p-2 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_14px_32px_rgba(15,23,42,0.18)] backdrop-blur-xl"
                          style={{ maxHeight: 'min(320px, calc(100vh - 180px))' }}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="grid grid-cols-1 gap-1.5">
                            {desktopFrameWidgetTemplates.map((template) => {
                              const TemplateIcon = template.icon;
                              return (
                                <button
                                  key={template.id}
                                  type="button"
                                  className="flex items-center gap-2 rounded-[12px] border border-white/14 bg-white/10 px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                                  onClick={() => convertDesktopWidgetFrame(widgetItem.instanceId, template.id)}
                                >
                                  <TemplateIcon size={14} strokeWidth={1.9} />
                                  <span className="min-w-0 flex-1 truncate">{template.name}</span>
                                </button>
                              );
                            })}
                            {customDesktopWidgets.map((widget) => (
                              <button
                                key={widget.instanceId}
                                type="button"
                                className="flex items-center gap-2 rounded-[12px] border border-white/14 bg-white/10 px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                                onClick={() => convertDesktopWidgetFrameToCustom(widgetItem.instanceId, widget)}
                              >
                                <Palette size={14} strokeWidth={1.9} />
                                <span className="min-w-0 flex-1 truncate">{widget.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                } else if (isInsideWidget) {
                  // Widget 内部位置，不渲染
                  continue;
                } else if (appItem) {
                  // 渲染 App 图标 - 设置 grid 位置
                  const app = desktopAppMap.get(appItem.componentId);
                  if (app) {
                    const customIcon = settings.customIcons?.[app.id];
                    const runtimeIcon = app.runtimeIcon;
                    const customIconNode = customIcon
                      ? <img src={customIcon} alt={app.name} className="w-full h-full object-cover" />
                      : runtimeIcon
                        ? <span className="text-[26px] leading-none">{runtimeIcon}</span>
                        : undefined;

                    // 计算 App 的 grid 位置
                    const gridColumnStart = appItem.x + 1;
                    const gridRowStart = appItem.y + 1;
                    const draggingOffset = draggingDesktopIcon?.instanceId === appItem.instanceId
                      ? draggingDesktopIcon
                      : null;
                    const jiggleSeed = appItem.instanceId
                      .split('')
                      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
                    cells.push(
                      <div
                        key={appItem.instanceId}
                        data-desktop-icon-id={appItem.instanceId}
                        style={{
                          gridColumn: `${gridColumnStart}`,
                          gridRow: `${gridRowStart}`,
                          transform: draggingOffset
                            ? `translate3d(${draggingOffset.dx}px, ${draggingOffset.dy}px, 0)`
                            : undefined,
                          transition: draggingOffset
                            ? 'none'
                            : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
                          zIndex: draggingOffset ? 60 : undefined,
                          pointerEvents: draggingOffset ? 'auto' : undefined,
                        }}
                      >
                        <AppIcon
                          name={app.name}
                          icon={app.icon as any}
                          label={settings.showAppName ? app.name : undefined}
                          customIcon={customIconNode}
                          onClick={() => openApp(app.id)}
                          isEditing={isDesktopEditing}
                          canRemove={!isSystemAppId(appItem.componentId)}
                          onRemove={() => uninstallDesktopApp(appItem)}
                          onPointerDown={(event) => startDesktopIconPointer(event, appItem)}
                          onPointerMove={moveDesktopIconPointer}
                          onPointerUp={endDesktopIconPointer}
                          onPointerCancel={endDesktopIconPointer}
                          jiggleDelayMs={-(jiggleSeed % 700)}
                          jiggleDurationMs={700 + (jiggleSeed % 180)}
                          size={effectiveIconSize}
                          radius={effectiveIconRadius}
                          frosted={settings.iconFrosted}
                          shadow={effectiveIconShadow}
                        />
                      </div>
                    );
                  }
                }
                // 空白位置不渲染任何内容
              }
            }
            return cells;
          })()}
        </div>
      </main>

      {draggingDesktopIcon && activePage !== draggingDesktopIcon.sourcePage ? (() => {
        const item = items.find((entry) => entry.instanceId === draggingDesktopIcon.instanceId);
        const app = item ? desktopAppMap.get(item.componentId) : null;
        if (!item || !app) return null;
        const customIcon = settings.customIcons?.[app.id];
        const runtimeIcon = app.runtimeIcon;
        const customIconNode = customIcon
          ? <img src={customIcon} alt={app.name} className="w-full h-full object-cover" />
          : runtimeIcon
            ? <span className="text-[26px] leading-none">{runtimeIcon}</span>
            : undefined;
        return (
          <div
            className="pointer-events-none fixed z-[80]"
            style={{
              left: `${draggingDesktopIcon.clientX - draggingDesktopIcon.pointerOffsetX}px`,
              top: `${draggingDesktopIcon.clientY - draggingDesktopIcon.pointerOffsetY}px`,
              transform: 'translate3d(-50%, -50%, 0)',
            }}
          >
            <AppIcon
              name={app.name}
              icon={app.icon as any}
              label={settings.showAppName ? app.name : undefined}
              customIcon={customIconNode}
              isEditing={false}
              canRemove={false}
              size={effectiveIconSize}
              radius={effectiveIconRadius}
              frosted={settings.iconFrosted}
              shadow={effectiveIconShadow}
            />
          </div>
        );
      })() : null}

      {draggingDesktopWidget && activePage !== draggingDesktopWidget.sourcePage ? (() => {
        const item = items.find((entry) => entry.instanceId === draggingDesktopWidget.instanceId);
        if (!item) return null;
        const widgetConfig = getWidgetById(item.componentId);
        const width = item.w || widgetConfig?.defaultWidth || 1;
        const height = item.h || widgetConfig?.defaultHeight || 1;
        const gridRect = desktopGridRef.current?.getBoundingClientRect();
        const overlayWidth = gridRect ? (gridRect.width / cols) * width : width * 86;
        const overlayHeight = gridRect ? (gridRect.height / rows) * height : height * 86;
        return (
          <div
            className="pointer-events-none fixed z-[80] overflow-hidden rounded-2xl"
            style={{
              left: `${draggingDesktopWidget.clientX - draggingDesktopWidget.pointerOffsetX}px`,
              top: `${draggingDesktopWidget.clientY - draggingDesktopWidget.pointerOffsetY}px`,
              width: `${overlayWidth}px`,
              height: `${overlayHeight}px`,
            }}
          >
            <WidgetPlaceholder
              name={item.data?.name || widgetConfig?.name || 'Widget'}
              backgroundImage={item.data?.backgroundImage || item.data?.placeholderIcon || ''}
              defaultIcon={widgetConfig?.defaultIcon || ''}
              status={item.componentId === 'custom-widget' ? 'normal' : 'building'}
              cornerRadius={item.data?.cornerRadius}
              frosted={item.data?.frosted}
              shadow={item.data?.shadow}
              templateId={typeof item.data?.templateId === 'string' ? item.data.templateId : undefined}
              subtitle={typeof item.data?.subtitle === 'string' ? item.data.subtitle : undefined}
              titleText={typeof item.data?.titleText === 'string' ? item.data.titleText : undefined}
              titleColor={typeof item.data?.titleColor === 'string' ? item.data.titleColor : undefined}
              titleFontSize={typeof item.data?.titleFontSize === 'number' ? item.data.titleFontSize : undefined}
              widgetCode={typeof item.data?.widgetCode === 'string' ? item.data.widgetCode : undefined}
              musicPlaying={typeof item.data?.musicPlaying === 'boolean' ? item.data.musicPlaying : undefined}
              musicTitle={typeof item.data?.musicTitle === 'string' ? item.data.musicTitle : undefined}
              musicArtist={typeof item.data?.musicArtist === 'string' ? item.data.musicArtist : undefined}
              isEditing={false}
              width={width}
              height={height}
            />
          </div>
        );
      })() : null}

      {!activeAppId && computedPageCount > 1 && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
        >
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: computedPageCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => setActivePage(index)}
                aria-label={`Go to page ${index + 1}`}
                className={`h-2 rounded-full transition-all ${
                  index === activePage
                    ? 'w-5 bg-white/90'
                    : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Home Dock - Only show when no app is active */}
      {!activeAppId && (
        <HomeDock
          onOpenPhone={() => openApp('contacts', { initialTab: 'phone' })}
          bottomOffset={desktopDockBottomOffset}
          isEditing={isDesktopEditing}
        />
      )}

      {/* Home Indicator - Only show when no app is active */}
      {!activeAppId && shouldRenderCustomHomeIndicator && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/30 rounded-full z-50"
          style={{ bottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
        />
      )}
    </div>
  );
}
