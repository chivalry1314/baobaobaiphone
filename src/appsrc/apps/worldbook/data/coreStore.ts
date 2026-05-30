import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorldInfoEntry } from '../types';
import { createWorldBookPersistOptions } from './storePersistRepo';

export interface WorldBookStoreState {
  worldBook: WorldInfoEntry[];
  setWorldBook: (entries: WorldInfoEntry[]) => void;
  addWorldEntry: (entry: Omit<WorldInfoEntry, 'id'> | WorldInfoEntry) => void;
  updateWorldEntry: (id: string, entry: Partial<WorldInfoEntry>) => void;
  deleteWorldEntry: (id: string) => void;
}

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

export const useWorldBookCoreStore = create<WorldBookStoreState>()(
  persist(
    (set) => ({
      worldBook: [],

      setWorldBook: (entries) => set({ worldBook: entries }),

      addWorldEntry: (entry) =>
        set((state) => ({
          worldBook: [...state.worldBook, { ...entry, id: 'id' in entry && entry.id ? entry.id : generateId() }],
        })),

      updateWorldEntry: (id, updatedEntry) =>
        set((state) => ({
          worldBook: state.worldBook.map((entry) =>
            entry.id === id ? { ...entry, ...updatedEntry } : entry
          ),
        })),

      deleteWorldEntry: (id) =>
        set((state) => ({
          worldBook: state.worldBook.filter((entry) => entry.id !== id),
        })),
    }),
    createWorldBookPersistOptions<WorldBookStoreState>()
  )
);
