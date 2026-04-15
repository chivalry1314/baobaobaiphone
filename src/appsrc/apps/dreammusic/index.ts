import type { AppManifest } from '@mimisOS/sdk';
import { DreamMusicApp } from './DreamMusicApp';
import { registerDreamMusicDailyScriptAction } from './dailyScriptAction';

registerDreamMusicDailyScriptAction();

const dreamMusicManifest: AppManifest = {
  id: 'dreammusic',
  name: '梦音乐',
  icon: 'Music2',
  color: '#3B82F6',
  component: DreamMusicApp,
  market: {
    icon: '🎧',
    tags: ['音乐', '歌单', '网易云'],
    sortOrder: 36,
  },
  description: '支持网易云歌单分享导入，并尝试直链播放。',
};

export default dreamMusicManifest;
