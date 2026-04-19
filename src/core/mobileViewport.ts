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

export const useKeyboardViewportStabilizer = (
  enabled = true,
  scrollContainerRef?: RefObject<HTMLElement | null>
): void => {
  const shouldEnable = useMemo(
    () => enabled && isKeyboardViewportStabilizerDevice(),
    [enabled]
  );

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
        if (!scrollContainer.contains(activeElement)) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = activeElement.getBoundingClientRect();
        const topPadding = 12;
        const bottomPadding = 20;

        if (elementRect.top < containerRect.top + topPadding) {
          scrollContainer.scrollTop -= containerRect.top + topPadding - elementRect.top;
        } else if (elementRect.bottom > containerRect.bottom - bottomPadding) {
          scrollContainer.scrollTop += elementRect.bottom - (containerRect.bottom - bottomPadding);
        }
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
      scheduleStabilize(120);
      scheduleStabilize(260);
    };

    const handleViewportShift = () => {
      if (!isKeyboardTextEntryElement(document.activeElement)) return;
      scheduleStabilize(0);
    };

    const handleWindowScroll = () => {
      if (!isKeyboardTextEntryElement(document.activeElement)) return;
      scrollWindowToTop();
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleViewportShift);
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
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('resize', handleViewportShift);
      window.removeEventListener('orientationchange', handleViewportShift);
      window.visualViewport?.removeEventListener('resize', handleViewportShift);
      window.visualViewport?.removeEventListener('scroll', handleViewportShift);
    };
  }, [scrollContainerRef, shouldEnable]);
};
