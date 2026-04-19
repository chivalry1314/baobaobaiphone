import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

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
