import type { StateCreator } from 'zustand';
import type { DeliverySellerStore, DeliverySellerActions, DeliverySellerState } from '../types';
import type { UserReview, ReviewFilter, DeliveryOrder } from '../../types';

type ReviewSliceState = Pick<DeliverySellerState, 'reviews' | 'reviewFilter' | 'badReviewCount'>;
type ReviewSliceActions = Pick<
  DeliverySellerActions,
  'setReviews' | 'addReviewReply' | 'setReviewFilter' | 'loadReviews' | 'getBadReviewCount'
>;

export type ReviewSlice = ReviewSliceState & ReviewSliceActions;

export const createReviewSlice: StateCreator<
  DeliverySellerStore,
  [['zustand/devtools', never]],
  [],
  ReviewSlice
> = (set, get) => ({
  // State
  reviews: [],
  reviewFilter: 'all',
  badReviewCount: 0,

  // Actions
  setReviews: (reviews) => {
    set({ reviews }, false, 'reviews/setReviews');
    // 自动计算差评数量
    get().getBadReviewCount();
  },

  addReviewReply: (reviewId, replyContent) => {
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              replyContent,
              replyAt: Date.now(),
            }
          : r
      ),
    }), false, 'reviews/addReviewReply');
  },

  setReviewFilter: (filter) => {
    set({ reviewFilter: filter }, false, 'reviews/setReviewFilter');
  },

  loadReviews: () => {
    const state = get();
    const reviews = generateReviewsFromOrders(state.orders);
    set({ reviews }, false, 'reviews/loadReviews');
    get().getBadReviewCount();
  },

  getBadReviewCount: () => {
    const state = get();
    const badReviewCount = state.reviews.filter((r) => r.rating <= 2).length;
    set({ badReviewCount }, false, 'reviews/getBadReviewCount');
    return badReviewCount;
  },
});

// 从订单生成模拟评价数据
const generateReviewsFromOrders = (orders: DeliveryOrder[]): UserReview[] => {
  const completedOrders = orders.filter((o) => o.status === 'completed' && o.rated);
  
  return completedOrders.map((order) => ({
    id: `review_${order.id}`,
    orderId: order.id,
    userId: `user_${order.address.phone}`,
    userName: order.address.consignee.slice(0, 1) + '**',
    rating: order.ratingScore || 5,
    content: generateReviewContent(order.ratingScore || 5),
    images: order.ratingScore === 5 ? [order.dishInfos[0]?.image || ''] : undefined,
    replyContent: undefined,
    replyAt: undefined,
    createdAt: order.completedAt || order.createdAt,
    isBadReview: (order.ratingScore || 5) <= 2,
  }));
};

// 生成模拟评价内容
const generateReviewContent = (rating: number): string => {
  const goodReviews = [
    '味道很好，配送也快！',
    '包装精美，食材新鲜，会回购～',
    '分量足，味道正宗，推荐！',
    '配送小哥很给力，食物也好吃',
    '超级满意，五星好评！',
  ];
  
  const normalReviews = [
    '还可以，符合预期',
    '味道一般，配送挺快',
    '中规中矩吧',
  ];
  
  const badReviews = [
    '味道不太好，有点失望',
    '配送太慢了，食物都凉了',
    '包装破损，体验很差',
  ];
  
  if (rating >= 4) {
    return goodReviews[Math.floor(Math.random() * goodReviews.length)];
  } else if (rating === 3) {
    return normalReviews[Math.floor(Math.random() * normalReviews.length)];
  } else {
    return badReviews[Math.floor(Math.random() * badReviews.length)];
  }
};
