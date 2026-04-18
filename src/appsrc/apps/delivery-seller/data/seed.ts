import type {
  DeliveryDish,
  DeliveryDishCategory,
  DeliveryOrder,
  DeliveryOrderTimelineItem,
  ShopConfig,
  ShopStatus,
  MarketingCampaign,
  OpeningHour,
} from '../types';

const now = Date.now();

// ============ 店铺配置种子数据 ============

const createOpeningHours = (): OpeningHour[] => {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    open: '09:00',
    close: '22:00',
    isOpen: dayOfWeek !== 0, // 周日休息
  }));
};

export const createSeedShopConfig = (): ShopConfig => ({
  id: 'shop-001',
  merchantId: 'merchant-demo',
  name: '包包白快餐店',
  logo: 'https://example.com/logo.png',
  cover: 'https://example.com/cover.png',
  bizType: 'fastfood',
  description: '专注美味快餐，用心做好每一餐',
  announcement: '欢迎光临！新店开业，全场 8.8 折优惠！',
  notice: '高峰期可能延迟 5-10 分钟，请谅解。',
  minOrderAmount: 20,
  deliveryFee: 4,
  packageFee: 2,
  serviceTags: ['准时达', '可开发票', '支持预订', '极速退款'],
  openingHours: createOpeningHours(),
  status: {
    isOpen: true,
    autoAcceptOrders: true,
    preparationMinutes: 15,
    busyMode: false,
    lastStatusChangeAt: now,
  },
  createdAt: now - 30 * 24 * 60 * 60 * 1000,
  updatedAt: now,
});

export const createSeedShopStatus = (): ShopStatus => ({
  isOpen: true,
  autoAcceptOrders: true,
  preparationMinutes: 15,
  busyMode: false,
  lastStatusChangeAt: now,
});

// ============ 商品分类种子数据 ============

export const createSeedCategories = (): DeliveryDishCategory[] => [
  { id: 'cat-hot', merchantId: 'merchant-demo', name: '热销榜单', sort: 1 },
  { id: 'cat-main', merchantId: 'merchant-demo', name: '主食套餐', sort: 2 },
  { id: 'cat-side', merchantId: 'merchant-demo', name: '小食配菜', sort: 3 },
  { id: 'cat-drink', merchantId: 'merchant-demo', name: '饮料', sort: 4 },
];

// ============ 商品种子数据 ============

export const createSeedProducts = (): DeliveryDish[] => [
  {
    id: 'product-001',
    merchantId: 'merchant-demo',
    categoryId: 'cat-hot',
    name: '招牌黑椒鸡排饭',
    desc: '精选鸡排，黑椒腌制，外酥里嫩',
    image: 'https://example.com/dish1.png',
    price: 28,
    originalPrice: 32,
    monthlySales: 980,
    stock: 50,
    skus: [
      {
        id: 'sku-rice-001',
        name: '米饭份量',
        options: [
          { id: 'opt-rice-normal', name: '标准', priceDelta: 0 },
          { id: 'opt-rice-more', name: '加饭', priceDelta: 2 },
        ],
        required: true,
      },
    ],
    status: 'on',
  },
  {
    id: 'product-002',
    merchantId: 'merchant-demo',
    categoryId: 'cat-hot',
    name: '香辣牛肉盖饭',
    desc: '新鲜牛肉现炒，微辣开胃',
    image: 'https://example.com/dish2.png',
    price: 32,
    originalPrice: 36,
    monthlySales: 750,
    stock: 40,
    skus: [
      {
        id: 'sku-spicy-001',
        name: '辣度',
        options: [
          { id: 'opt-no-spicy', name: '不辣', priceDelta: 0 },
          { id: 'opt-mid-spicy', name: '微辣', priceDelta: 0 },
          { id: 'opt-hot-spicy', name: '中辣', priceDelta: 0 },
        ],
        required: true,
      },
    ],
    status: 'on',
  },
  {
    id: 'product-003',
    merchantId: 'merchant-demo',
    categoryId: 'cat-main',
    name: '糖醋里脊套餐',
    desc: '经典糖醋口味，酸甜可口',
    image: 'https://example.com/dish3.png',
    price: 26,
    monthlySales: 620,
    stock: 35,
    skus: [],
    status: 'on',
  },
  {
    id: 'product-004',
    merchantId: 'merchant-demo',
    categoryId: 'cat-side',
    name: '酥炸鸡米花',
    desc: '外酥里嫩，蘸酱更香',
    image: 'https://example.com/dish4.png',
    price: 16,
    monthlySales: 890,
    stock: 60,
    skus: [],
    status: 'on',
  },
  {
    id: 'product-005',
    merchantId: 'merchant-demo',
    categoryId: 'cat-side',
    name: '凉拌黄瓜',
    desc: '清爽解腻，夏日必备',
    image: 'https://example.com/dish5.png',
    price: 8,
    monthlySales: 450,
    stock: 0, // 售罄
    skus: [],
    status: 'on',
  },
  {
    id: 'product-006',
    merchantId: 'merchant-demo',
    categoryId: 'cat-drink',
    name: '可乐',
    desc: '冰镇可乐，畅爽体验',
    image: 'https://example.com/dish6.png',
    price: 5,
    monthlySales: 1200,
    stock: 100,
    skus: [],
    status: 'on',
  },
  {
    id: 'product-007',
    merchantId: 'merchant-demo',
    categoryId: 'cat-drink',
    name: '豆浆',
    desc: '现磨豆浆，营养健康',
    image: 'https://example.com/dish7.png',
    price: 6,
    monthlySales: 380,
    stock: 5, // 低库存
    skus: [
      {
        id: 'sku-temp-001',
        name: '温度',
        options: [
          { id: 'opt-hot', name: '热', priceDelta: 0 },
          { id: 'opt-cold', name: '冷', priceDelta: 0 },
        ],
        required: true,
      },
    ],
    status: 'on',
  },
  {
    id: 'product-008',
    merchantId: 'merchant-demo',
    categoryId: 'cat-main',
    name: '红烧狮子头套餐',
    desc: '传统工艺，肉质鲜嫩',
    image: 'https://example.com/dish8.png',
    price: 30,
    monthlySales: 280,
    stock: 25,
    skus: [],
    status: 'off', // 已下架
  },
];

// ============ 订单种子数据 ============

const createTimeline = (status: string): DeliveryOrderTimelineItem[] => {
  const baseTimeline: DeliveryOrderTimelineItem[] = [
    {
      id: 'timeline-1',
      kind: 'paid',
      label: '用户已支付',
      at: now - 60 * 60 * 1000,
    },
  ];

  if (status === 'accepted' || status === 'preparing' || status === 'delivering' || status === 'completed') {
    baseTimeline.push({
      id: 'timeline-2',
      kind: 'accepted',
      label: '商家已接单',
      at: now - 55 * 60 * 1000,
    });
  }

  if (status === 'preparing' || status === 'delivering' || status === 'completed') {
    baseTimeline.push({
      id: 'timeline-3',
      kind: 'preparing',
      label: '开始制作',
      at: now - 50 * 60 * 1000,
    });
  }

  if (status === 'delivering' || status === 'completed') {
    baseTimeline.push({
      id: 'timeline-4',
      kind: 'delivering',
      label: '已出餐，配送中',
      at: now - 35 * 60 * 1000,
    });
  }

  if (status === 'completed') {
    baseTimeline.push({
      id: 'timeline-5',
      kind: 'completed',
      label: '订单已完成',
      at: now - 15 * 60 * 1000,
    });
  }

  return baseTimeline;
};

export const createSeedOrders = (): DeliveryOrder[] => [
  {
    id: 'order-001',
    merchantId: 'merchant-demo',
    merchantName: '包包白快餐店',
    lines: [
      {
        id: 'line-001',
        merchantId: 'merchant-demo',
        dishId: 'product-001',
        dishName: '招牌黑椒鸡排饭',
        unitPrice: 28,
        qty: 1,
        selectedOptions: [
          { skuId: 'sku-rice-001', optionId: 'opt-rice-normal', optionName: '标准', priceDelta: 0 },
        ],
        note: '不要香菜',
      },
      {
        id: 'line-002',
        merchantId: 'merchant-demo',
        dishId: 'product-006',
        dishName: '可乐',
        unitPrice: 5,
        qty: 1,
        selectedOptions: [],
      },
    ],
    itemTotal: 33,
    packageFee: 2,
    deliveryFee: 4,
    discountFee: 0,
    payableAmount: 39,
    status: 'paid',
    address: {
      id: 'addr-001',
      name: '张先生',
      phone: '138****0001',
      detail: '浦东新区世纪大道 100 号 2 栋 1203',
      isDefault: true,
    },
    deliveryTimeMode: 'instant',
    estimatedDeliveredAt: now + 30 * 60 * 1000,
    createdAt: now - 60 * 60 * 1000,
    paidAt: now - 59 * 60 * 1000,
    urgeCount: 0,
    afterSaleStatus: 'none',
    rated: false,
    timeline: createTimeline('paid'),
  },
  {
    id: 'order-002',
    merchantId: 'merchant-demo',
    merchantName: '包包白快餐店',
    lines: [
      {
        id: 'line-003',
        merchantId: 'merchant-demo',
        dishId: 'product-002',
        dishName: '香辣牛肉盖饭',
        unitPrice: 32,
        qty: 2,
        selectedOptions: [
          { skuId: 'sku-spicy-001', optionId: 'opt-mid-spicy', optionName: '微辣', priceDelta: 0 },
        ],
      },
    ],
    itemTotal: 64,
    packageFee: 2,
    deliveryFee: 4,
    discountFee: 5,
    payableAmount: 65,
    status: 'preparing',
    address: {
      id: 'addr-002',
      name: '李女士',
      phone: '139****0002',
      detail: '黄浦区南京东路 88 号 11 楼',
      isDefault: true,
    },
    deliveryTimeMode: 'instant',
    estimatedDeliveredAt: now + 25 * 60 * 1000,
    createdAt: now - 90 * 60 * 1000,
    paidAt: now - 89 * 60 * 1000,
    urgeCount: 1,
    afterSaleStatus: 'none',
    rated: false,
    timeline: createTimeline('preparing'),
  },
  {
    id: 'order-003',
    merchantId: 'merchant-demo',
    merchantName: '包包白快餐店',
    lines: [
      {
        id: 'line-004',
        merchantId: 'merchant-demo',
        dishId: 'product-003',
        dishName: '糖醋里脊套餐',
        unitPrice: 26,
        qty: 1,
        selectedOptions: [],
      },
      {
        id: 'line-005',
        merchantId: 'merchant-demo',
        dishId: 'product-004',
        dishName: '酥炸鸡米花',
        unitPrice: 16,
        qty: 1,
        selectedOptions: [],
      },
    ],
    itemTotal: 42,
    packageFee: 2,
    deliveryFee: 4,
    discountFee: 0,
    payableAmount: 48,
    status: 'completed',
    address: {
      id: 'addr-003',
      name: '王先生',
      phone: '137****0003',
      detail: '徐汇区漕溪北路 399 号 B1',
      isDefault: true,
    },
    deliveryTimeMode: 'instant',
    estimatedDeliveredAt: now - 30 * 60 * 1000,
    createdAt: now - 120 * 60 * 1000,
    paidAt: now - 119 * 60 * 1000,
    finishedAt: now - 30 * 60 * 1000,
    urgeCount: 0,
    afterSaleStatus: 'none',
    rated: true,
    ratingScore: 5,
    timeline: createTimeline('completed'),
  },
  {
    id: 'order-004',
    merchantId: 'merchant-demo',
    merchantName: '包包白快餐店',
    lines: [
      {
        id: 'line-006',
        merchantId: 'merchant-demo',
        dishId: 'product-004',
        dishName: '酥炸鸡米花',
        unitPrice: 16,
        qty: 2,
        selectedOptions: [],
      },
    ],
    itemTotal: 32,
    packageFee: 2,
    deliveryFee: 4,
    discountFee: 0,
    payableAmount: 38,
    status: 'delivering',
    address: {
      id: 'addr-004',
      name: '赵女士',
      phone: '136****0004',
      detail: '静安区南京西路 1000 号',
      isDefault: true,
    },
    deliveryTimeMode: 'instant',
    estimatedDeliveredAt: now + 15 * 60 * 1000,
    createdAt: now - 45 * 60 * 1000,
    paidAt: now - 44 * 60 * 1000,
    urgeCount: 0,
    afterSaleStatus: 'none',
    rated: false,
    timeline: createTimeline('delivering'),
  },
];

// ============ 营销活动种子数据 ============

export const createSeedMarketingCampaigns = (): MarketingCampaign[] => [
  {
    id: 'marketing-001',
    merchantId: 'merchant-demo',
    type: 'fullReduction',
    title: '满 30 减 8',
    description: '单笔订单满 30 元立减 8 元',
    thresholdAmount: 30,
    discountAmount: 8,
    startTime: now - 7 * 24 * 60 * 60 * 1000,
    endTime: now + 7 * 24 * 60 * 60 * 1000,
    isActive: true,
    usageLimit: 1000,
    usedCount: 256,
    createdAt: now - 7 * 24 * 60 * 60 * 1000,
    updatedAt: now,
  },
  {
    id: 'marketing-002',
    merchantId: 'merchant-demo',
    type: 'discount',
    title: '新店 8.8 折',
    description: '新店开业，全场 8.8 折优惠',
    discountRate: 0.88,
    startTime: now - 3 * 24 * 60 * 60 * 1000,
    endTime: now + 4 * 24 * 60 * 60 * 1000,
    isActive: true,
    usageLimit: 500,
    usedCount: 89,
    createdAt: now - 3 * 24 * 60 * 60 * 1000,
    updatedAt: now,
  },
  {
    id: 'marketing-003',
    merchantId: 'merchant-demo',
    type: 'freeDelivery',
    title: '免配送费',
    description: '订单满 50 元免配送费',
    thresholdAmount: 50,
    startTime: now - 1 * 24 * 60 * 60 * 1000,
    endTime: now + 6 * 24 * 60 * 60 * 1000,
    isActive: false,
    usageLimit: 1000,
    usedCount: 0,
    createdAt: now - 1 * 24 * 60 * 60 * 1000,
    updatedAt: now,
  },
];

// ============ 导出完整种子状态 ============

export const createDeliverySellerSeedState = () => ({
  shopConfig: createSeedShopConfig(),
  shopStatus: createSeedShopStatus(),
  categories: createSeedCategories(),
  products: createSeedProducts(),
  orders: createSeedOrders(),
  marketingCampaigns: createSeedMarketingCampaigns(),
});
