import type { AppContext } from '../../../core/sdk/types';

export type DailyWordsDateFilter = 'today' | 'week' | 'all';

export interface DailyWordsEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  mood: string;
  dateKey: string;
  isSyncedToMemory: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DailyWordsDraft {
  title: string;
  content: string;
  tagsInput: string;
  mood: string;
}

export interface DailyWordsRoleState {
  entries: DailyWordsEntry[];
  draft: DailyWordsDraft;
  searchKeyword: string;
  dateFilter: DailyWordsDateFilter;
  showFullPreview: boolean;
}

export interface DailyWordsUpdatePayload {
  title: string;
  content: string;
  tags: string[];
  mood: string;
}

export interface DailyWordsStore extends DailyWordsRoleState {
  activeRoleId: string;
  dailyWordsStateByRoleId: Record<string, DailyWordsRoleState>;
  syncDailyWordsRoleContext: () => void;
  setDraft: (patch: Partial<DailyWordsDraft>) => void;
  clearDraft: () => void;
  createEntryFromDraft: () => void;
  updateEntry: (entryId: string, payload: DailyWordsUpdatePayload) => void;
  removeEntry: (entryId: string) => void;
  importInspectorEntries: (roleId: string, entries: DailyWordsEntry[]) => void;
  clearInspectorEntries: (roleId: string) => void;
  setSearchKeyword: (value: string) => void;
  setDateFilter: (value: DailyWordsDateFilter) => void;
  setShowFullPreview: (value: boolean) => void;
  syncEntryMemory: (entryId: string) => void;
  unsyncEntryMemory: (entryId: string) => void;
}

export interface DailyWordsAppProps {
  onClose: () => void;
  context?: AppContext;
}
