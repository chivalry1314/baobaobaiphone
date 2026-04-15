import type { AppManifest } from '@baobaobaiOS/sdk';
import { WarmTrackApp } from './WarmTrackApp';

const warmTrackManifest: AppManifest = {
  id: 'warmtrack',
  name: '暖迹',
  icon: 'Droplets',
  color: '#FF6AA6',
  component: WarmTrackApp,
  market: {
    icon: '🩷',
    tags: ['女性健康', '经期', '记录'],
    sortOrder: 14,
  },
  description: '记录经期状态、症状和每日健康信息。',
};

export default warmTrackManifest;
