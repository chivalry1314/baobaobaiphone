import type { AppManifest } from '@mimisOS/sdk';
import { SellerApp } from './SellerApp';

const deliverySellerManifest: AppManifest = {
  id: 'delivery-seller',
  name: '外卖商家',
  icon: 'Store',
  color: '#F97316',
  component: SellerApp,
  version: '1.0.0',
  isSystem: false,
  market: {
    icon: '🍱',
    author: 'MimiPhone',
    size: '内置应用',
    tags: ['外卖', '商家', '店铺', '配送'],
    sortOrder: 51,
  },
  description: '外卖商家端：店铺管理、商品管理、订单处理与数据统计。',
};

export default deliverySellerManifest;
