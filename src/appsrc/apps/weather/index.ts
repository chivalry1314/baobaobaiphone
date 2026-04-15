import type { AppManifest } from '@mimisOS/sdk';
import { WeatherApp } from './WeatherApp';

const weatherManifest: AppManifest = {
  id: 'weather',
  name: '天气',
  icon: 'Cloud',
  color: '#5AC8FA',
  component: WeatherApp,
  market: {
    icon: '🌤️',
    tags: ['天气', '生活'],
    sortOrder: 30,
  },
  description: '查看实时天气和未来预报。',
};

export default weatherManifest;
