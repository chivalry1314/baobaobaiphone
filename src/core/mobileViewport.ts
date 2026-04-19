import { useMemo } from 'react';
import type { CSSProperties } from 'react';

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

export const useMobileViewportPageStyle = (): CSSProperties => {
  const shouldFollowVisualViewport = useMemo(() => isIOSViewportDevice(), []);

  return useMemo(
    () => getMobileViewportPageStyle(shouldFollowVisualViewport),
    [shouldFollowVisualViewport]
  );
};
