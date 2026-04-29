import type { AppManifest } from '@baobaobaiOS/sdk';
import { DeliveryApp } from './DeliveryApp';

const deliveryManifest: AppManifest = {
  id: 'delivery',
  name: '外卖',
  icon: 'UtensilsCrossed',
  color: '#FF6A3D',
  component: DeliveryApp,
  isSystem: true,
  market: {
    icon: '🍔',
    tags: ['外卖', '点餐', '商家管理'],
    sortOrder: 35,
  },
  description: '外卖首页、店铺列表、店铺详情、下单页和店铺管理页。',
};

export { DeliveryApp };

export default deliveryManifest;
