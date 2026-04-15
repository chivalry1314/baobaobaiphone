import type { Address, ProductItem } from './types';

export const palettes = [
  'linear-gradient(135deg, #fde68a 0%, #fb7185 100%)',
  'linear-gradient(135deg, #fbcfe8 0%, #93c5fd 100%)',
  'linear-gradient(135deg, #86efac 0%, #60a5fa 100%)',
  'linear-gradient(135deg, #fdba74 0%, #a78bfa 100%)',
  'linear-gradient(135deg, #c7d2fe 0%, #fda4af 100%)',
  'linear-gradient(135deg, #99f6e4 0%, #fb7185 100%)',
];

export const initialDessertProducts: ProductItem[] = [
  {
    id: 'p1',
    name: '奶油蜜桃蛋糕',
    price: 89.9,
    desc: '精选蜜桃果肉，松软戚风胚体，动物奶油轻盈。',
    isSelected: false,
    storeId: 'store-1',
  },
  {
    id: 'p2',
    name: '焦糖布丁',
    price: 19.9,
    desc: '丝滑口感，焦香浓郁，冷藏后更佳。',
    isSelected: false,
    storeId: 'store-1',
  },
  {
    id: 'p3',
    name: '抹茶大福',
    price: 29.9,
    desc: '日式手工大福，内馅饱满，抹茶清雅。',
    isSelected: false,
    storeId: 'store-1',
  },
  {
    id: 'p4',
    name: '草莓芝士挞',
    price: 39.9,
    desc: '浓郁芝士与莓果酸甜，层次丰富。',
    isSelected: false,
    storeId: 'store-1',
  },
  {
    id: 'p5',
    name: '黑巧熔岩',
    price: 45,
    desc: '切开爆浆流心，苦甜平衡。',
    isSelected: false,
    storeId: 'store-1',
  },
];

export const initialFlowerProducts: ProductItem[] = [
  {
    id: 'f1',
    name: '红玫瑰 19 枝',
    price: 268,
    desc: '经典红玫瑰，附贺卡与礼盒。',
    img: palettes[0],
    isSelected: false,
    storeId: 'store-2',
  },
  {
    id: 'f2',
    name: '白色郁金香',
    price: 198,
    desc: '清爽通透的白色系花束。',
    img: palettes[2],
    isSelected: false,
    storeId: 'store-2',
  },
  {
    id: 'f3',
    name: '向日葵元气花束',
    price: 228,
    desc: '明亮治愈，适合送朋友。',
    img: palettes[5],
    isSelected: false,
    storeId: 'store-2',
  },
  {
    id: 'f4',
    name: '香槟玫瑰 11 枝',
    price: 239,
    desc: '温柔香槟色，约会必备。',
    img: palettes[4],
    isSelected: false,
    storeId: 'store-2',
  },
];

export const defaultAddresses: Address[] = [
  {
    id: 'addr-1',
    name: '张三',
    phone: '13800000000',
    address: '上海市 浦东新区 世纪大道 100 号',
    isDefault: true,
  },
];
