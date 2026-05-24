import type { AppMemoryRecord } from '../../../core/appMemory';
import { createAppMemoryApi } from '../../../core/appMemoryCenter';
import { getActiveRoleId } from '../contacts/activeRole';

export type DreamMusicMemorySourceType =
  | 'favorite-track'
  | 'comment-track'
  | 'recent-play-summary'
  | 'listen-together-duration';

export interface DreamMusicMemoryRecord extends AppMemoryRecord {
  appId: 'dreammusic';
  sourceType?: DreamMusicMemorySourceType;
}

export const dreamMusicMemoryController = createAppMemoryApi<
  'dreammusic',
  DreamMusicMemoryRecord
>('dreammusic', {
  mapRecord: (record) => ({
    ...record,
    appId: 'dreammusic',
    sourceType: record.sourceType as DreamMusicMemorySourceType | undefined,
  }),
  defaultSpace: 'personal',
  resolveRoleId: getActiveRoleId,
});
