import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TemplateItem, TemplateState } from './types';
import { createTemplatePersistOptions } from './data/repositories/storePersistRepo';

interface TemplateStore extends TemplateState {
  addItem: (item: Omit<TemplateItem, 'id'>) => void;
  removeItem: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set) => ({
      items: [
        { id: '1', title: '示例条目 1', description: '这是一条示例描述。' },
        { id: '2', title: '示例条目 2', description: '这是另一条示例描述。' },
      ],
      isLoading: false,
      error: null,

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, { ...item, id: `item-${generateId()}` }],
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    createTemplatePersistOptions<TemplateStore>()
  )
);

