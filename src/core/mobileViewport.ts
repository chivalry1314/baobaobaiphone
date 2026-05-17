import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

const NON_KEYBOARD_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'date',
  'datetime-local',
  'file',
  'hidden',
  'image',
  'month',
  'radio',
  'range',
  'reset',
  'submit',
  'time',
  'week',
]);

export const isIOSViewportDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  const isIOSUserAgent = /iPad|iPhone|iPod/i.test(userAgent);
  const isMacTouchDevice = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOSUserAgent || isMacTouchDevice;
};

export const getMobileViewportPageStyle = (
  shouldFollowVisualViewport: boolean
): CSSProperties => {
  if (shouldFollowVisualViewport) {
    return {
      top: 'var(--app-vv-offset-top, 0px)',
      height: 'var(--app-vv-height, var(--app-dvh, 100dvh))',
    };
  }

  return {
    top: 0,
    height: 'var(--app-dvh, 100dvh)',
  };
};

export const isKeyboardTextEntryElement = (element: Element | null): boolean => {
  if (element instanceof HTMLTextAreaElement) {
    return !element.readOnly && !element.disabled;
  }

  if (element instanceof HTMLInputElement) {
    if (element.readOnly || element.disabled) return false;
    const type = (element.type || 'text').toLowerCase();
    return !NON_KEYBOARD_INPUT_TYPES.has(type);
  }

  return element instanceof HTMLElement && element.isContentEditable;
};

export const useMobileViewportPageStyle = (
  followVisualViewport = true
): CSSProperties => {
  const shouldFollowVisualViewport = useMemo(
    () => isIOSViewportDevice() && followVisualViewport,
    [followVisualViewport]
  );

  return useMemo(
    () => getMobileViewportPageStyle(shouldFollowVisualViewport),
    [shouldFollowVisualViewport]
  );
};

export const useKeyboardTextEntryActive = (enabled = true): boolean => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      setIsActive(false);
      return;
    }

    let syncTimer: number | null = null;

    const syncState = () => {
      if (syncTimer !== null && typeof window !== 'undefined') {
        window.clearTimeout(syncTimer);
        syncTimer = null;
      }
      setIsActive(isKeyboardTextEntryElement(document.activeElement));
    };

    const syncStateDeferred = () => {
      if (typeof window === 'undefined') {
        syncState();
        return;
      }
      if (syncTimer !== null) {
        window.clearTimeout(syncTimer);
      }
      syncTimer = window.setTimeout(syncState, 0);
    };

    syncState();
    document.addEventListener('focusin', syncState);
    document.addEventListener('focusout', syncStateDeferred);

    return () => {
      if (syncTimer !== null && typeof window !== 'undefined') {
        window.clearTimeout(syncTimer);
      }
      document.removeEventListener('focusin', syncState);
      document.removeEventListener('focusout', syncStateDeferred);
    };
  }, [enabled]);

  return isActive;
};

export const useKeyboardViewportInset = (enabled = true): number => {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setKeyboardInset(0);
      return;
    }

    const visualViewport = window.visualViewport;
    if (!visualViewport) {
      setKeyboardInset(0);
      return;
    }

    let rafId: number | null = null;

    const syncInset = () => {
      const layoutViewportHeight = Math.round(window.innerHeight);
      const viewportHeight = Math.round(visualViewport.height);
      const viewportOffsetTop = Math.max(0, Math.round(visualViewport.offsetTop));
      const nextInset = Math.max(0, layoutViewportHeight - (viewportHeight + viewportOffsetTop));
      setKeyboardInset(nextInset);
    };

    const scheduleSync = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        syncInset();
      });
    };

    syncInset();
    window.addEventListener('resize', scheduleSync);
    window.addEventListener('orientationchange', scheduleSync);
    visualViewport.addEventListener('resize', scheduleSync);
    visualViewport.addEventListener('scroll', scheduleSync);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', scheduleSync);
      window.removeEventListener('orientationchange', scheduleSync);
      visualViewport.removeEventListener('resize', scheduleSync);
      visualViewport.removeEventListener('scroll', scheduleSync);
    };
  }, [enabled]);

  return keyboardInset;
};

const isCoarsePointerViewportDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
};

const isKeyboardViewportStabilizerDevice = (): boolean => {
  if (isIOSViewportDevice()) return true;
  return isCoarsePointerViewportDevice();
};

const scrollWindowToTop = () => {
  if (typeof window === 'undefined') return;
  if (window.scrollY === 0 && window.pageYOffset === 0) return;
  window.scrollTo(0, 0);
};

const getKeyboardVisibleViewportBounds = () => {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0 };
  }

  const visualViewport = window.visualViewport;
  if (!visualViewport) {
    return { top: 0, bottom: window.innerHeight };
  }

  return {
    top: 0,
    bottom: Math.max(0, Math.min(window.innerHeight, visualViewport.height)),
  };
};

export const scrollFieldIntoViewInContainer = (
  scrollContainer: HTMLElement | null,
  target: HTMLElement | null,
  options?: {
    topPadding?: number;
    bottomPadding?: number;
    preferTopAlign?: boolean;
  }
): void => {
  if (
    typeof window === 'undefined' ||
    !scrollContainer ||
    !target ||
    !scrollContainer.contains(target)
  ) {
    return;
  }

  scrollWindowToTop();

  const containerRect = scrollContainer.getBoundingClientRect();
  const elementRect = target.getBoundingClientRect();
  const visibleViewport = getKeyboardVisibleViewportBounds();
  const visibleTop = Math.max(containerRect.top, visibleViewport.top);
  const visibleBottom = Math.min(containerRect.bottom, visibleViewport.bottom);
  const topPadding = options?.topPadding ?? 12;
  const bottomPadding = options?.bottomPadding ?? 24;
  const preferTopAlign = options?.preferTopAlign ?? false;
  const availableHeight = visibleBottom - visibleTop;

  if (availableHeight <= topPadding + bottomPadding) return;

  if (preferTopAlign) {
    const desiredTop = visibleTop + topPadding;
    const deltaToTop = elementRect.top - desiredTop;
    if (Math.abs(deltaToTop) > 2) {
      scrollContainer.scrollTop += deltaToTop;
    }
    return;
  }

  if (elementRect.top < visibleTop + topPadding) {
    scrollContainer.scrollTop -= visibleTop + topPadding - elementRect.top;
  } else if (elementRect.bottom > visibleBottom - bottomPadding) {
    scrollContainer.scrollTop += elementRect.bottom - (visibleBottom - bottomPadding);
  }
};

export const useKeyboardViewportStabilizer = (
  enabled = true,
  scrollContainerRef?: RefObject<HTMLElement | null>,
  options?: {
    topPadding?: number;
    bottomPadding?: number;
  }
): void => {
  const shouldEnable = useMemo(
    () => enabled && isKeyboardViewportStabilizerDevice(),
    [enabled]
  );
  const topPadding = options?.topPadding ?? 12;
  const bottomPadding = options?.bottomPadding ?? 24;

  useEffect(() => {
    if (!shouldEnable || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let rafId: number | null = null;
    const delayedTimerIds = new Set<number>();

    const runStabilize = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const activeElement = document.activeElement;
        if (!isKeyboardTextEntryElement(activeElement)) return;

        scrollWindowToTop();

        const scrollContainer = scrollContainerRef?.current;
        if (!scrollContainer || !(activeElement instanceof HTMLElement)) return;
        scrollFieldIntoViewInContainer(scrollContainer, activeElement, {
          preferTopAlign: true,
          topPadding,
          bottomPadding,
        });
      });
    };

    const scheduleStabilize = (delay = 0) => {
      if (delay <= 0) {
        runStabilize();
        return;
      }

      const timerId = window.setTimeout(() => {
        delayedTimerIds.delete(timerId);
        runStabilize();
      }, delay);
      delayedTimerIds.add(timerId);
    };

    const handleFocusIn = () => {
      scheduleStabilize(0);
      scheduleStabilize(60);
      scheduleStabilize(120);
      scheduleStabilize(260);
      scheduleStabilize(420);
    };

    const handleViewportShift = () => {
      if (!isKeyboardTextEntryElement(document.activeElement)) return;
      scheduleStabilize(0);
    };

    const handleInput = () => {
      if (!isKeyboardTextEntryElement(document.activeElement)) return;
      scheduleStabilize(0);
    };

    const handleWindowScroll = () => {
      if (!isKeyboardTextEntryElement(document.activeElement)) return;
      scrollWindowToTop();
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleViewportShift);
    document.addEventListener('input', handleInput, true);
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    window.addEventListener('resize', handleViewportShift);
    window.addEventListener('orientationchange', handleViewportShift);
    window.visualViewport?.addEventListener('resize', handleViewportShift);
    window.visualViewport?.addEventListener('scroll', handleViewportShift);

    handleViewportShift();

    return () => {
      delayedTimerIds.forEach((timerId) => window.clearTimeout(timerId));
      delayedTimerIds.clear();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleViewportShift);
      document.removeEventListener('input', handleInput, true);
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('resize', handleViewportShift);
      window.removeEventListener('orientationchange', handleViewportShift);
      window.visualViewport?.removeEventListener('resize', handleViewportShift);
      window.visualViewport?.removeEventListener('scroll', handleViewportShift);
    };
  }, [bottomPadding, scrollContainerRef, shouldEnable, topPadding]);
};
