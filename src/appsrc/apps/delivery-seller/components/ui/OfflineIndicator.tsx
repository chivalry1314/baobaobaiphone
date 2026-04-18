import React, { useState, useEffect } from 'react';

export interface OfflineIndicatorProps {
  onReconnect?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onReconnect }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onReconnect?.();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onReconnect]);

  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-indicator">
      <span className="offline-icon">📡</span>
      <span className="offline-text">网络已断开，请检查网络连接</span>
      <button className="offline-reconnect-btn" onClick={handleOnline}>
        重新连接
      </button>
    </div>
  );
};

// 离线数据缓存工具
export class OfflineCache {
  private static CACHE_KEY = 'delivery_seller_offline_cache';
  private static CACHE_VERSION = 1;

  static async set<T>(key: string, data: T): Promise<void> {
    try {
      const cache = await this.getCache();
      cache[key] = {
        data,
        timestamp: Date.now(),
      };
      await this.saveCache(cache);
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  static async get<T>(key: string, maxAge?: number): Promise<T | null> {
    try {
      const cache = await this.getCache();
      const item = cache[key];
      
      if (!item) {
        return null;
      }

      if (maxAge && Date.now() - item.timestamp > maxAge) {
        // 数据过期
        delete cache[key];
        await this.saveCache(cache);
        return null;
      }

      return item.data as T;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  static async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  private static async getCache(): Promise<Record<string, any>> {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  }

  private static async saveCache(cache: Record<string, any>): Promise<void> {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }
}

// 检测网络状态的工具函数
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// 等待网络恢复
export function waitForOnline(timeoutMs = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    const handleOnline = () => {
      cleanup();
      resolve(true);
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('online', handleOnline);
    };

    window.addEventListener('online', handleOnline, { once: true });
  });
}
