import type {
  DeliveryAddress,
  DeliveryCoupon,
  DeliveryDish,
  DeliveryDishCategory,
  DeliveryDishOption,
  DeliveryDishSku,
  DeliveryMerchant,
  DeliveryUserProfile,
} from '../types';

const now = Date.now();

const createMerchant = (
  input: Omit<DeliveryMerchant, 'createdAt' | 'updatedAt'> & { createdOffsetHour: number; updatedOffsetMin: number }
): DeliveryMerchant => {
  const { createdOffsetHour, updatedOffsetMin, ...rest } = input;
  return {
    ...rest,
    createdAt: now - createdOffsetHour * 60 * 60 * 1000,
    updatedAt: now - updatedOffsetMin * 60 * 1000,
  };
};

export const takeoutSeedMerchants: DeliveryMerchant[] = [
  createMerchant({
    id: 'merchant-rice-house',
    name: '满分盖饭',
    bizType: 'fastfood',
    rating: 4.8,
    monthlySales: 4231,
    minOrderAmount: 20,
    deliveryFee: 4,
    avgDeliveryMinutes: 28,
    distanceKm: 1.2,
    promotions: ['满30减8', '下单返2元券'],
    tags: ['盖饭', '快餐', '出餐快'],
    announcement: '高峰期可能延迟 5-10 分钟，请谅解。',
    notice: '米饭默认普通份，可在规格中加饭。',
    serviceTags: ['准时达', '可开发票', '支持预订'],
    isOpen: true,
    visible: true,
    createdOffsetHour: 24 * 40,
    updatedOffsetMin: 18,
  }),
  createMerchant({
    id: 'merchant-milk-tea',
    name: '椰云奶茶局',
    bizType: 'drink',
    rating: 4.7,
    monthlySales: 5160,
    minOrderAmount: 15,
    deliveryFee: 3,
    avgDeliveryMinutes: 24,
    distanceKm: 0.8,
    promotions: ['第二杯半价', '满25减5'],
    tags: ['奶茶', '果茶', '下午茶'],
    announcement: '新鲜水果现切，售完即止。',
    notice: '默认正常冰，支持备注去冰。',
    serviceTags: ['品牌连锁', '极速出单', '安心食材'],
    isOpen: true,
    visible: true,
    createdOffsetHour: 24 * 55,
    updatedOffsetMin: 30,
  }),
  createMerchant({
    id: 'merchant-night-bbq',
    name: '深夜小串',
    bizType: 'snack',
    rating: 4.6,
    monthlySales: 2980,
    minOrderAmount: 35,
    deliveryFee: 5,
    avgDeliveryMinutes: 35,
    distanceKm: 2.4,
    promotions: ['夜宵满50减10'],
    tags: ['烧烤', '夜宵', '小吃'],
    announcement: '夜间订单较多，请耐心等待。',
    notice: '默认微辣，可在备注调整辣度。',
    serviceTags: ['夜间营业', '到店自取', '可预约'],
    isOpen: true,
    visible: true,
    createdOffsetHour: 24 * 33,
    updatedOffsetMin: 60,
  }),
  createMerchant({
    id: 'merchant-dessert-lab',
    name: '轻甜研究所',
    bizType: 'dessert',
    rating: 4.9,
    monthlySales: 2100,
    minOrderAmount: 18,
    deliveryFee: 4,
    avgDeliveryMinutes: 30,
    distanceKm: 1.5,
    promotions: ['新品立减3元'],
    tags: ['甜品', '蛋糕', '低糖'],
    announcement: '新品海盐可可千层限量供应。',
    notice: '冷藏甜品建议 30 分钟内食用。',
    serviceTags: ['低糖可选', '甜品专送', '品质保障'],
    isOpen: true,
    visible: true,
    createdOffsetHour: 24 * 27,
    updatedOffsetMin: 45,
  }),
  createMerchant({
    id: 'merchant-fruit-station',
    name: '鲜果补给站',
    bizType: 'fruit',
    rating: 4.7,
    monthlySales: 1765,
    minOrderAmount: 22,
    deliveryFee: 4,
    avgDeliveryMinutes: 26,
    distanceKm: 1.1,
    promotions: ['满39减6'],
    tags: ['水果切盒', '鲜果杯'],
    announcement: '当天水果当天切，口感更佳。',
    notice: '部分水果会按季节替换。',
    serviceTags: ['新鲜直送', '源头采购', '售后无忧'],
    isOpen: true,
    visible: true,
    createdOffsetHour: 24 * 22,
    updatedOffsetMin: 25,
  }),
  createMerchant({
    id: 'merchant-noodle-express',
    name: '面面俱到',
    bizType: 'fastfood',
    rating: 4.5,
    monthlySales: 2540,
    minOrderAmount: 20,
    deliveryFee: 4,
    avgDeliveryMinutes: 29,
    distanceKm: 1.9,
    promotions: ['午市满25减4'],
    tags: ['拌面', '汤面', '饺子'],
    announcement: '工作日午市加单中，感谢支持。',
    notice: '汤面建议到手后尽快食用。',
    serviceTags: ['出餐稳定', '加料自选', '支持拼单'],
    isOpen: true,
    visible: true,
    createdOffsetHour: 24 * 30,
    updatedOffsetMin: 40,
  }),
  createMerchant({
    id: 'merchant-soup-kitchen',
    name: '暖胃汤铺',
    bizType: 'fastfood',
    rating: 4.6,
    monthlySales: 1320,
    minOrderAmount: 28,
    deliveryFee: 5,
    avgDeliveryMinutes: 33,
    distanceKm: 2.8,
    promotions: ['满49减7', '满69减12'],
    tags: ['炖汤', '砂锅', '轻食'],
    announcement: '砂锅打包采用保温密封盒。',
    notice: '部分套餐含热饮，注意防烫。',
    serviceTags: ['健康轻食', '汤品保温', '安心包装'],
    isOpen: true,
    visible: true,
    createdOffsetHour: 24 * 36,
    updatedOffsetMin: 35,
  }),
  createMerchant({
    id: 'merchant-coffee-lab',
    name: '角落咖啡实验室',
    bizType: 'drink',
    rating: 4.8,
    monthlySales: 2210,
    minOrderAmount: 18,
    deliveryFee: 3,
    avgDeliveryMinutes: 23,
    distanceKm: 0.9,
    promotions: ['咖啡第二杯 7 折'],
    tags: ['咖啡', '烘焙', '轻食'],
    announcement: '新品冷萃已上线，欢迎尝鲜。',
    notice: '咖啡口味偏苦，可在规格中调甜。',
    serviceTags: ['精品豆', '30 分钟达', '支持备注'],
    isOpen: true,
    visible: true,
    createdOffsetHour: 24 * 14,
    updatedOffsetMin: 16,
  }),
];

const category = (id: string, merchantId: string, name: string, sort: number): DeliveryDishCategory => ({
  id,
  merchantId,
  name,
  sort,
});

export const takeoutSeedCategories: DeliveryDishCategory[] = [
  category('cat-rice-hot', 'merchant-rice-house', '热销', 1),
  category('cat-rice-main', 'merchant-rice-house', '主食', 2),
  category('cat-rice-side', 'merchant-rice-house', '小吃', 3),

  category('cat-tea-hot', 'merchant-milk-tea', '热销', 1),
  category('cat-tea-milk', 'merchant-milk-tea', '奶茶', 2),
  category('cat-tea-fruit', 'merchant-milk-tea', '果茶', 3),

  category('cat-bbq-hot', 'merchant-night-bbq', '热门串烧', 1),
  category('cat-bbq-snack', 'merchant-night-bbq', '下酒小吃', 2),

  category('cat-dessert-hot', 'merchant-dessert-lab', '热销', 1),
  category('cat-dessert-cake', 'merchant-dessert-lab', '蛋糕', 2),

  category('cat-fruit-box', 'merchant-fruit-station', '鲜果切盒', 1),
  category('cat-fruit-cup', 'merchant-fruit-station', '果杯', 2),

  category('cat-noodle-hot', 'merchant-noodle-express', '热销', 1),
  category('cat-noodle-main', 'merchant-noodle-express', '面食', 2),

  category('cat-soup-hot', 'merchant-soup-kitchen', '招牌汤品', 1),
  category('cat-soup-light', 'merchant-soup-kitchen', '轻食套餐', 2),

  category('cat-coffee-signature', 'merchant-coffee-lab', '招牌咖啡', 1),
  category('cat-coffee-bake', 'merchant-coffee-lab', '烘焙轻食', 2),
];

const option = (id: string, name: string, priceDelta: number): DeliveryDishOption => ({
  id,
  name,
  priceDelta,
});

const sku = (
  id: string,
  name: string,
  options: DeliveryDishOption[],
  required = false
): DeliveryDishSku => ({
  id,
  name,
  options,
  required,
});

const hotOrColdSku = sku('sku-temp', '温度', [option('opt-hot', '热', 0), option('opt-cold', '冷', 0)], true);
const sugarSku = sku('sku-sugar', '甜度', [option('opt-low-sugar', '少糖', 0), option('opt-normal-sugar', '正常糖', 0)], true);
const riceSizeSku = sku('sku-rice-size', '米饭份量', [option('opt-rice-normal', '标准', 0), option('opt-rice-more', '加饭', 2)], true);
const spicyLevelSku = sku('sku-spicy', '辣度', [option('opt-spicy-no', '不辣', 0), option('opt-spicy-mid', '微辣', 0), option('opt-spicy-hot', '中辣', 0)], true);
const noodleAddonSku = sku('sku-noodle-addon', '加料', [option('opt-egg', '加蛋', 2), option('opt-beef', '加牛肉', 6)]);
const iceLevelSku = sku('sku-ice', '冰量', [option('opt-no-ice', '去冰', 0), option('opt-less-ice', '少冰', 0), option('opt-normal-ice', '正常冰', 0)], true);

const dish = (
  id: string,
  merchantId: string,
  categoryId: string,
  name: string,
  desc: string,
  price: number,
  monthlySales: number,
  skus: DeliveryDishSku[] = [],
  stock = 99,
  originalPrice?: number
): DeliveryDish => ({
  id,
  merchantId,
  categoryId,
  name,
  desc,
  price,
  originalPrice,
  monthlySales,
  stock,
  skus,
  status: 'on',
});

export const takeoutSeedDishes: DeliveryDish[] = [
  dish('dish-rice-1', 'merchant-rice-house', 'cat-rice-hot', '黑椒鸡排双拼饭', '鸡排+时蔬，酱香浓郁。', 28, 980, [riceSizeSku], 99, 32),
  dish('dish-rice-2', 'merchant-rice-house', 'cat-rice-main', '香辣牛肉盖饭', '牛肉现炒，微辣开胃。', 31, 820, [riceSizeSku, spicyLevelSku]),
  dish('dish-rice-3', 'merchant-rice-house', 'cat-rice-side', '酥炸鸡米花', '外酥里嫩，蘸酱更香。', 16, 560),

  dish('dish-tea-1', 'merchant-milk-tea', 'cat-tea-hot', '椰云生打椰', '椰乳+轻奶油，入口绵密。', 19, 2300, [hotOrColdSku, sugarSku, iceLevelSku]),
  dish('dish-tea-2', 'merchant-milk-tea', 'cat-tea-fruit', '多肉葡萄', '真实果肉，清爽低负担。', 22, 1760, [iceLevelSku, sugarSku]),
  dish('dish-tea-3', 'merchant-milk-tea', 'cat-tea-milk', '黑糖珍珠奶茶', '黑糖熬煮，珍珠 Q 弹。', 18, 1980, [hotOrColdSku, sugarSku]),

  dish('dish-bbq-1', 'merchant-night-bbq', 'cat-bbq-hot', '招牌牛肉串（5串）', '焦香多汁，夜宵必点。', 29, 640, [spicyLevelSku]),
  dish('dish-bbq-2', 'merchant-night-bbq', 'cat-bbq-hot', '蒜香烤茄子', '炭火慢烤，蒜香浓郁。', 16, 390, [spicyLevelSku]),
  dish('dish-bbq-3', 'merchant-night-bbq', 'cat-bbq-snack', '蜂蜜烤鸡翅（2只）', '外焦里嫩，甜咸平衡。', 22, 280),

  dish('dish-dessert-1', 'merchant-dessert-lab', 'cat-dessert-hot', '伯爵芝士切块', '奶香醇厚，不腻口。', 24, 410),
  dish('dish-dessert-2', 'merchant-dessert-lab', 'cat-dessert-cake', '海盐可可千层', '层次丰富，微苦回甘。', 27, 355),
  dish('dish-dessert-3', 'merchant-dessert-lab', 'cat-dessert-cake', '草莓奶油卷', '新鲜草莓，绵软蛋糕体。', 23, 288),

  dish('dish-fruit-1', 'merchant-fruit-station', 'cat-fruit-box', '缤纷鲜果盒', '当季水果拼盘，净重约 350g。', 26, 430),
  dish('dish-fruit-2', 'merchant-fruit-station', 'cat-fruit-cup', '芒果酸奶杯', '低脂酸奶+鲜切芒果。', 21, 305),
  dish('dish-fruit-3', 'merchant-fruit-station', 'cat-fruit-box', '西瓜凤梨双拼盒', '解腻清爽，饭后首选。', 19, 278),

  dish('dish-noodle-1', 'merchant-noodle-express', 'cat-noodle-hot', '招牌牛腩拌面', '牛腩软烂，酱汁浓郁。', 27, 705, [noodleAddonSku, spicyLevelSku]),
  dish('dish-noodle-2', 'merchant-noodle-express', 'cat-noodle-main', '番茄鸡蛋汤面', '酸甜开胃，汤底清爽。', 22, 492, [noodleAddonSku]),
  dish('dish-noodle-3', 'merchant-noodle-express', 'cat-noodle-main', '韭菜猪肉饺（10只）', '现包现煮，汁水足。', 24, 268),

  dish('dish-soup-1', 'merchant-soup-kitchen', 'cat-soup-hot', '山药排骨汤套餐', '排骨慢炖 2 小时，暖胃滋补。', 36, 260),
  dish('dish-soup-2', 'merchant-soup-kitchen', 'cat-soup-light', '菌菇鸡汤轻食盒', '低脂高蛋白，健康搭配。', 32, 198),
  dish('dish-soup-3', 'merchant-soup-kitchen', 'cat-soup-hot', '番茄牛腩砂锅', '酸甜浓郁，下饭首选。', 34, 230),

  dish('dish-coffee-1', 'merchant-coffee-lab', 'cat-coffee-signature', '海盐拿铁', '奶香与咖啡苦感平衡。', 20, 610, [hotOrColdSku, sugarSku]),
  dish('dish-coffee-2', 'merchant-coffee-lab', 'cat-coffee-signature', '橙香冷萃', '果香回甘，低酸顺滑。', 24, 380, [iceLevelSku]),
  dish('dish-coffee-3', 'merchant-coffee-lab', 'cat-coffee-bake', '黄油可颂', '当日现烤，层层酥脆。', 14, 220),
];

export const takeoutSeedAddresses: DeliveryAddress[] = [
  {
    id: 'address-home',
    name: '张三',
    phone: '13800000001',
    detail: '上海市浦东新区世纪大道 100 号 2 栋 1203',
    lat: 31.235,
    lng: 121.501,
    isDefault: true,
  },
  {
    id: 'address-office',
    name: '张三',
    phone: '13800000001',
    detail: '上海市黄浦区南京东路 88 号 11 楼',
    lat: 31.236,
    lng: 121.49,
    isDefault: false,
  },
  {
    id: 'address-gym',
    name: '张三',
    phone: '13800000001',
    detail: '上海市徐汇区漕溪北路 399 号 B1 健身中心前台',
    lat: 31.199,
    lng: 121.436,
    isDefault: false,
  },
];

export const takeoutSeedCoupons: DeliveryCoupon[] = [
  {
    id: 'coupon-1',
    title: '满30减6',
    thresholdAmount: 30,
    discountAmount: 6,
    expiresAt: now + 1000 * 60 * 60 * 24 * 10,
    used: false,
  },
  {
    id: 'coupon-2',
    title: '满50减12',
    thresholdAmount: 50,
    discountAmount: 12,
    expiresAt: now + 1000 * 60 * 60 * 24 * 5,
    used: false,
  },
  {
    id: 'coupon-3',
    title: '满80减20',
    thresholdAmount: 80,
    discountAmount: 20,
    expiresAt: now + 1000 * 60 * 60 * 24 * 3,
    used: false,
  },
];

export const takeoutSeedProfile: DeliveryUserProfile = {
  id: 'self',
  name: '张三',
  membershipLevel: 'gold',
};

const cloneMerchant = (merchant: DeliveryMerchant): DeliveryMerchant => ({
  ...merchant,
  promotions: [...merchant.promotions],
  tags: [...merchant.tags],
  serviceTags: [...merchant.serviceTags],
});

const cloneDishOption = (input: DeliveryDishOption): DeliveryDishOption => ({ ...input });

const cloneDishSku = (input: DeliveryDishSku): DeliveryDishSku => ({
  ...input,
  options: input.options.map(cloneDishOption),
});

const cloneDish = (input: DeliveryDish): DeliveryDish => ({
  ...input,
  skus: input.skus.map(cloneDishSku),
});

const cloneAddress = (input: DeliveryAddress): DeliveryAddress => ({ ...input });

const cloneCoupon = (input: DeliveryCoupon): DeliveryCoupon => ({ ...input });

export const createTakeoutSeedState = () => ({
  merchants: takeoutSeedMerchants.map(cloneMerchant),
  categories: takeoutSeedCategories.map((item) => ({ ...item })),
  dishes: takeoutSeedDishes.map(cloneDish),
  addresses: takeoutSeedAddresses.map(cloneAddress),
  coupons: takeoutSeedCoupons.map(cloneCoupon),
  profile: { ...takeoutSeedProfile },
});
