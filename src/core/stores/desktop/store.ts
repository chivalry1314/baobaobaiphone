import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DesktopItem, DesktopLayoutConfig } from '../types';
import { createDesktopPersistOptions } from './storePersistRepo';

export interface DesktopStoreState {
  desktopLayout: DesktopLayoutConfig;
  updateDesktopLayout: (layout: Partial<DesktopLayoutConfig>) => void;
  addDesktopItem: (item: Omit<DesktopItem, 'instanceId'>) => void;
  updateDesktopItem: (instanceId: string, item: Partial<DesktopItem>) => void;
  removeDesktopItem: (instanceId: string) => void;
}

export const defaultDesktopLayout: DesktopLayoutConfig = {
  rows: 6,
  cols: 4,
  pageCount: 1,
  items: [],
  customWidgets: [],
};

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

export const useDesktopCoreStore = create<DesktopStoreState>()(
  persist(
    (set) => ({
      desktopLayout: defaultDesktopLayout,

      updateDesktopLayout: (layout) =>
        set((state) => ({ desktopLayout: { ...state.desktopLayout, ...layout } })),

      addDesktopItem: (item) =>
        set((state) => ({
          desktopLayout: {
            ...state.desktopLayout,
            items: [...(state.desktopLayout.items || []), { ...item, instanceId: generateId() }],
          },
        })),

      updateDesktopItem: (instanceId, updatedItem) =>
        set((state) => ({
          desktopLayout: {
            ...state.desktopLayout,
            items: (state.desktopLayout.items || []).map((item) =>
              item.instanceId === instanceId ? { ...item, ...updatedItem } : item
            ),
          },
        })),

      removeDesktopItem: (instanceId) =>
        set((state) => ({
          desktopLayout: {
            ...state.desktopLayout,
            items: (state.desktopLayout.items || []).filter((item) => item.instanceId !== instanceId),
          },
        })),
    }),
    createDesktopPersistOptions<DesktopStoreState>()
  )
);
