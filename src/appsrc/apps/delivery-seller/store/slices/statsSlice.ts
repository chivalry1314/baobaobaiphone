import type { StateCreator } from 'zustand';
import type { DeliverySellerStore, DeliverySellerActions, DeliverySellerState } from '../types';
import type { StatsOverview, StatsTimeRange, DeliveryOrder, DeliveryDish, StatsTrendPoint, CategorySales } from '../../types';

type StatsSliceState = Pick<DeliverySellerState, 'statsOverview' | 'revenueTrend' | 'orderTrend' | 'categorySales'>;
type StatsSliceActions = Pick<
  DeliverySellerActions,
  | 'setStatsOverview'
  | 'setStatsTimeRange'
  | 'refreshStats'
  | 'setRevenueTrend'
  | 'setOrderTrend'
  | 'setCategorySales'
  | 'calculateTrendData'
  | 'calculateCategorySales'
>;

export type StatsSlice = StatsSliceState & StatsSliceActions;

export const createStatsSlice: StateCreator<
  DeliverySellerStore,
  [['zustand/devtools', never]],
  [],
  StatsSlice
> = (set, get) => ({
  // State
  statsOverview: null,
  revenueTrend: [],
  orderTrend: [],
  categorySales: [],

  // Actions
  setStatsOverview: (stats) => {
    set({ statsOverview: stats }, false, 'stats/setStatsOverview');
  },

  setRevenueTrend: (trend) => {
    set({ revenueTrend: trend }, false, 'stats/setRevenueTrend');
  },

  setOrderTrend: (trend) => {
    set({ orderTrend: trend }, false, 'stats/setOrderTrend');
  },

  setCategorySales: (sales) => {
    set({ categorySales: sales }, false, 'stats/setCategorySales');
  },

  setStatsTimeRange: (timeRange, startDate, endDate) => {
    const now = Date.now();
    let start = startDate || now;
    let end = endDate || now;

    switch (timeRange) {
      case 'today': {
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        start = today.getTime();
        end = now;
        break;
      }
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start = weekAgo.getTime();
        end = now;
        break;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        start = monthAgo.getTime();
        end = now;
        break;
      }
      case 'custom':
        // Use provided startDate and endDate
        break;
    }

    // Refresh stats with new time range
    get().refreshStats();
    get().calculateTrendData();
  },

  refreshStats: () => {
    const state = get();
    const stats = calculateStatsOverview(
      state.statsOverview?.timeRange || 'today',
      state.orders,
      state.products
    );
    set({ statsOverview: stats }, false, 'stats/refreshStats');
    get().calculateTrendData();
    get().calculateCategorySales();
  },

  calculateTrendData: () => {
    const state = get();
    const timeRange = state.statsOverview?.timeRange || 'today';
    const trendData = calculateTrendData(timeRange, state.orders);
    set({ revenueTrend: trendData.revenue, orderTrend: trendData.orders }, false, 'stats/calculateTrendData');
  },

  calculateCategorySales: () => {
    const state = get();
    const categorySales = calculateCategorySalesData(state.orders, state.products, state.categories);
    set({ categorySales }, false, 'stats/calculateCategorySales');
  },
});

// Helper function to calculate trend data
const calculateTrendData = (
  timeRange: StatsTimeRange,
  orders: DeliveryOrder[]
): { revenue: StatsTrendPoint[]; orders: StatsTrendPoint[] } => {
  const now = Date.now();
  let points: StatsTrendPoint[] = [];

  switch (timeRange) {
    case 'today': {
      // 按小时统计
      for (let hour = 0; hour < 24; hour++) {
        const pointDate = new Date(now);
        pointDate.setHours(hour, 0, 0, 0);
        const pointEnd = new Date(pointDate);
        pointEnd.setHours(hour + 1, 0, 0, 0);

        const periodOrders = orders.filter(
          (o) => o.createdAt >= pointDate.getTime() && o.createdAt < pointEnd.getTime()
        );
        const revenue = periodOrders.reduce((sum, o) => sum + o.payableAmount, 0);

        points.push({
          date: pointDate.getTime(),
          label: `${hour}:00`,
          revenue,
          orders: periodOrders.length,
        });
      }
      break;
    }
    case 'week': {
      // 按天统计（近 7 天）
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now);
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(24, 0, 0, 0);

        const periodOrders = orders.filter(
          (o) => o.createdAt >= dayStart.getTime() && o.createdAt < dayEnd.getTime()
        );
        const revenue = periodOrders.reduce((sum, o) => sum + o.payableAmount, 0);

        const label = i === 0 ? '今天' : `${i}天前`;
        points.push({
          date: dayStart.getTime(),
          label,
          revenue,
          orders: periodOrders.length,
        });
      }
      break;
    }
    case 'month': {
      // 按天统计（近 30 天）
      for (let i = 29; i >= 0; i--) {
        const dayStart = new Date(now);
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(24, 0, 0, 0);

        const periodOrders = orders.filter(
          (o) => o.createdAt >= dayStart.getTime() && o.createdAt < dayEnd.getTime()
        );
        const revenue = periodOrders.reduce((sum, o) => sum + o.payableAmount, 0);

        const date = new Date(dayStart);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        points.push({
          date: dayStart.getTime(),
          label,
          revenue,
          orders: periodOrders.length,
        });
      }
      break;
    }
    default:
      break;
  }

  return { revenue: points, orders: points };
};

// Helper function to calculate category sales
const calculateCategorySalesData = (
  orders: DeliveryOrder[],
  products: DeliveryDish[],
  categories: any[]
): CategorySales[] => {
  const completedOrders = orders.filter((o) => o.status === 'completed');
  
  // 统计每个分类的销量
  const categoryStats = new Map<string, { count: number; revenue: number }>();
  
  completedOrders.forEach((order) => {
    order.dishInfos.forEach((dish) => {
      const categoryId = dish.categoryId || 'unknown';
      const stats = categoryStats.get(categoryId) || { count: 0, revenue: 0 };
      stats.count += dish.quantity;
      stats.revenue += dish.payableAmount;
      categoryStats.set(categoryId, stats);
    });
  });

  // 计算总销量
  const totalSales = Array.from(categoryStats.values()).reduce((sum, s) => sum + s.count, 0);

  // 构建结果
  const result: CategorySales[] = Array.from(categoryStats.entries()).map(([categoryId, stats]) => {
    const category = categories.find((c) => c.id === categoryId);
    return {
      categoryId,
      categoryName: category?.name || '未分类',
      salesCount: stats.count,
      salesRevenue: stats.revenue,
      percentage: totalSales > 0 ? (stats.count / totalSales) * 100 : 0,
    };
  });

  // 按销量排序
  return result.sort((a, b) => b.salesCount - a.salesCount);
};

// Helper function to calculate stats overview
export const calculateStatsOverview = (
  timeRange: StatsTimeRange,
  orders: DeliveryOrder[],
  products: DeliveryDish[]
): StatsOverview => {
  const now = Date.now();
  let startDate: number;
  let endDate = now;

  switch (timeRange) {
    case 'today': {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      startDate = today.getTime();
      break;
    }
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.getTime();
      break;
    }
    case 'month': {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.getTime();
      break;
    }
    case 'custom':
    default: {
      startDate = now - 7 * 24 * 60 * 60 * 1000; // Default to last 7 days
      break;
    }
  }

  const filteredOrders = orders.filter((o) => o.createdAt >= startDate && o.createdAt <= endDate);
  const totalOrders = filteredOrders.length;
  const completedOrders = filteredOrders.filter((o) => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.payableAmount, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Unique customers
  const customerIds = new Set(filteredOrders.map((o) => o.address.phone));
  const totalCustomers = customerIds.size;
  
  // New customers (simplified: customers with only 1 order in the period)
  const orderCountByCustomer = new Map<string, number>();
  filteredOrders.forEach((o) => {
    const phone = o.address.phone;
    orderCountByCustomer.set(phone, (orderCountByCustomer.get(phone) || 0) + 1);
  });
  const newCustomers = Array.from(orderCountByCustomer.values()).filter((c) => c === 1).length;

  const completionRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;
  
  // Average preparation time (simplified estimate)
  const avgPreparationMinutes = 15; // Would calculate from timeline in real implementation

  // Ratings
  const ratedOrders = completedOrders.filter((o) => o.rated);
  const totalRatings = ratedOrders.length;
  const avgRating = totalRatings > 0
    ? ratedOrders.reduce((sum, o) => sum + (o.ratingScore || 0), 0) / totalRatings
    : 0;

  return {
    timeRange,
    startDate,
    endDate,
    totalOrders,
    totalRevenue,
    avgOrderValue,
    totalCustomers,
    newCustomers,
    completionRate,
    avgPreparationMinutes,
    avgRating,
    totalRatings,
  };
};
