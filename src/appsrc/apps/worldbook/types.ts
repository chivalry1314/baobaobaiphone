// WorldBook Types
export type WorldEntryTriggerMode = 'keyword' | 'constant' | 'disabled';

export interface WorldInfoEntry {
  id: string;
  name: string;
  keywords: string[];
  content: string;
  triggerMode: WorldEntryTriggerMode;
  insertionOrder: number;
  scope: 'global' | 'character';
  /** Optional trace id used when this entry was installed from a remote share card. */
  sourceCardId?: string;
}
