import type { AppManifest } from '@mimisOS/sdk';
import { TakeoutApp } from './TakeoutApp';

const takeoutManifest: AppManifest = {
  id: 'takeout',
  name: '外卖',
  icon: 'UtensilsCrossed',
  color: '#F97316',
  component: TakeoutApp,
  version: '1.0.0',
  isSystem: false,
  market: {
    icon: '🍱',
    author: 'MimiPhone',
    size: '内置应用',
    tags: ['外卖', '配送', '餐饮'],
    sortOrder: 42,
  },
  description: '浏览商家、加购下单与订单管理。',
};

export default takeoutManifest;
