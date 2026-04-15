import type { AppManifest } from '@baobaobaiOS/sdk';
import { SellerApp } from './SellerApp';

const sellerManifest: AppManifest = {
  id: 'seller',
  name: '开店吧',
  icon: 'ShoppingBag',
  color: '#F43F5E',
  component: SellerApp,
  market: {
    icon: '🏪',
    tags: ['卖家', '店铺', '经营'],
    sortOrder: 50,
  },
  description: '店铺数据、订单与商品管理。',
};

export default sellerManifest;
