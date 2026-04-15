import type { AppManifest } from '@baobaobaiOS/sdk';
import { ShoppingApp } from './ShoppingApp';

const shoppingManifest: AppManifest = {
  id: 'shopping',
  name: '去逛街',
  icon: 'ShoppingCart',
  color: '#F472B6',
  component: ShoppingApp,
  market: {
    icon: '🛍️',
    tags: ['电商', '购物'],
    sortOrder: 40,
  },
  description: '商品浏览、下单和订单管理。',
};

export default shoppingManifest;
