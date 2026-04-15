import type { AppMemoryModule } from '../../../core/appMemoryRegistry';
import { getRoleDisplayNameSnapshot } from '../../shared/business/contacts/roleDisplayNameBridge';
import type { DreamMusicMemoryRecord, DreamMusicMemorySourceType } from './memory';

const DREAM_MUSIC_SOURCE_LABELS: Partial<Record<DreamMusicMemorySourceType, string>> = {
  'favorite-track': '收藏歌曲',
  'comment-track': '歌曲评论',
  'recent-play-summary': '最近播放摘要',
};

export const dreamMusicAppMemoryModule: AppMemoryModule<DreamMusicMemoryRecord> = {
  appId: 'dreammusic',
  defaultSpace: 'personal',
  resolveContactName: (contactId) => getRoleDisplayNameSnapshot(contactId),
  resolveSourceLabel: (record) => {
    const sourceType = record.sourceType as DreamMusicMemorySourceType | undefined;
    if (!sourceType) return undefined;
    return DREAM_MUSIC_SOURCE_LABELS[sourceType] || sourceType;
  },
};

export default dreamMusicAppMemoryModule;
