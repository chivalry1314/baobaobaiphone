/**
 * 格式化金额为元单位字符串
 */
export const formatPrice = (price: number): string => {
  return `¥${price.toFixed(2)}`;
};

/**
 * 格式化整数金额（无小数位）
 */
export const formatPriceInt = (price: number): string => {
  return `¥${Math.round(price)}`;
};

/**
 * 格式化时间戳为 HH:mm 格式
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * 格式化时间戳为 MM/DD HH:mm 格式
 */
export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};

/**
 * 格式化时间戳为相对时间（刚刚、5 分钟前、1 小时前等）
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (minutes < 1) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return formatDateTime(timestamp);
  }
};

/**
 * 格式化订单状态为中文
 */
export const formatOrderStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending-payment': '待支付',
    'paid': '已支付',
    'accepted': '已接单',
    'preparing': '制作中',
    'delivering': '配送中',
    'completed': '已完成',
    'cancelled': '已取消',
    'refunding': '退款中',
  };
  return statusMap[status] || status;
};

/**
 * 格式化商品状态为中文
 */
export const formatProductStatus = (status: 'on' | 'off'): string => {
  return status === 'on' ? '上架' : '下架';
};

/**
 * 格式化营业状态
 */
export const formatShopStatus = (isOpen: boolean, busyMode: boolean): string => {
  if (!isOpen) {
    return '休息中';
  }
  if (busyMode) {
    return '忙碌中';
  }
  return '营业中';
};

/**
 * 格式化数字（添加千分位）
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN');
};

/**
 * 格式化评分（保留 1 位小数）
 */
export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

/**
 * 计算折扣率显示文本
 */
export const formatDiscountRate = (rate: number): string => {
  return `${(rate * 10).toFixed(1)}折`;
};

/**
 * 格式化营业时间
 */
export const formatOpeningHour = (open: string, close: string): string => {
  return `${open}-${close}`;
};

/**
 * 计算预计送达时间
 */
export const formatEstimatedDelivery = (preparationMinutes: number, deliveryMinutes: number): string => {
  const totalMinutes = preparationMinutes + deliveryMinutes;
  const now = new Date();
  const estimated = new Date(now.getTime() + totalMinutes * 60 * 1000);
  return formatTime(estimated.getTime());
};

/**
 * 截断文本（超过长度显示省略号）
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * 格式化手机号（中间 4 位隐藏）
 */
export const formatPhone = (phone: string): string => {
  if (phone.length !== 11) {
    return phone;
  }
  return phone.slice(0, 3) + '****' + phone.slice(7);
};
