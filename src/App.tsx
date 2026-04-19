import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { ensureWebPushSubscription, isPushOpenAppMessage } from './core/push/webPush';
import { isSystemAppId, SYSTEM_APP_IDS } from './core/systemApps';
import { hasAppMarketHydrated, onAppMarketHydrated, useAppMarketStore } from './appsrc/apps/appmarket/store';
import { getInstalledRuntimeMarketApps, isMarketAppId } from './appsrc/apps/appmarket/runtime';
import { WidgetPlaceholder } from './appsrc/apps/settings/components/WidgetPlaceholder';

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
  const settings = useSettingsCoreStore((state) => state.settings);
  const updateSettings = useSettingsCoreStore((state) => state.updateSettings);
  const desktopLayout = useDesktopCoreStore((state) => state.desktopLayout);
  const updateDesktopItem = useDesktopCoreStore((state) => state.updateDesktopItem);
  const addDesktopItem = useDesktopCoreStore((state) => state.addDesktopItem);
  const removeDesktopItem = useDesktopCoreStore((state) => state.removeDesktopItem);
  const updateDesktopLayout = useDesktopCoreStore((state) => state.updateDesktopLayout);
  const { installedAppIds, uploadedApps } = useAppMarketStore();

  // 初始化桌面布局
  const { cols = 4, rows = 6, items = [], pageCount = 1 } = desktopLayout;

  const installableLocalAppIdSet = useMemo(() => {
    return new Set(localApps.filter((app) => !app.isSystem).map((app) => app.id));
  }, []);

  const installedLocalAppIdSet = useMemo(() => {
    return new Set(installedAppIds.filter((appId) => installableLocalAppIdSet.has(appId)));
  }, [installedAppIds, installableLocalAppIdSet]);
  const [activePage, setActivePage] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const fullscreenHintTimerRef = useRef<number | null>(null);
  const isDenseGrid = cols >= 5;
  const isIOSStandalonePwa = isIOSDevice() && isStandalonePwa;
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
    };
  }, []);

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

  // 当前页的桌面项目
  const currentPageItems = items.filter(item => item.page === activePage);

  // 分离 App 和 Widget
  const appItems = currentPageItems.filter(item => item.type === 'app');
  const widgetItems = currentPageItems.filter(item => item.type === 'widget');

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

  return (
    <div
      className="fixed left-0 right-0 top-0 bg-white overflow-hidden flex flex-col"
      style={{ height: 'var(--app-physical-height, var(--app-dvh, 100dvh))' }}
    >
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
          const t = e.touches[0];
          if (!t) return;
          touchStartRef.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
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
                  
                  cells.push(
                    <div
                      key={widgetItem.instanceId}
                      style={{
                        gridColumn: `${gridColumnStart} / ${gridColumnEnd}`,
                        gridRow: `${gridRowStart} / ${gridRowEnd}`,
                      }}
                      className="rounded-2xl overflow-hidden"
                    >
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
                          width={w}
                          height={h}
                        />
                      )}
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
                    cells.push(
                      <div
                        key={appItem.instanceId}
                        style={{
                          gridColumn: `${gridColumnStart}`,
                          gridRow: `${gridRowStart}`,
                        }}
                      >
                        <AppIcon
                          name={app.name}
                          icon={app.icon as any}
                          label={settings.showAppName ? app.name : undefined}
                          customIcon={customIconNode}
                          onClick={() => openApp(app.id)}
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
      {!activeAppId && <HomeDock onOpenPhone={() => openApp('contacts', { initialTab: 'phone' })} />}

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
