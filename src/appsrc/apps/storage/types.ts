import type { ElementType } from 'react';

export interface StorageAppProps {
  onClose: () => void;
}

export interface StorageCategory {
  id: string;
  name: string;
  accent: string;
  muted: string;
  Icon: ElementType;
  description: string;
}

export interface StorageCategoryStat extends StorageCategory {
  fileCount: number;
  totalSize: number;
}

export interface StorageFile {
  id: string;
  name: string;
  extension: string;
  size: number;
  categoryId: string;
  categoryName?: string;
  source: string;
  updatedAt: number;
  dbName: string;
  storeName: string;
  originKey: string;
  originKeyValue: IDBValidKey;
  segment?: string;
  resetValue?: unknown;
  readOnly?: boolean;
}

export type SortKey = 'recent' | 'name' | 'size';
