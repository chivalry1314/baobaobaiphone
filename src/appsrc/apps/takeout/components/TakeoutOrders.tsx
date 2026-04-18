import React from 'react';
import { motion } from 'motion/react';
import { FileText } from 'lucide-react';
import type { DeliveryOrder } from '../types';
import {
  formatDateTime,
  formatMoney,
  getOrderStatusLabel,
  isOrderCompleted,
  isOrderOngoing,
  resolveOrderLiveStatus,
} from '../utils';
import { EmptyState, SkeletonOrderCard } from './index';

type OrderFilterKey = 'all' | 'ongoing' | 'completed' | 'refunding';

interface TakeoutOrdersProps {
  orders: DeliveryOrder[];
  isLoading?: boolean;
  onOpenOrderDetail: (orderId: string) => void;
  onReorder: (orderId: string) => void;
  onUrge: (orderId: string) => void;
  onAfterSale: (orderId: string) => void;
  onRate: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onGoShopping?: () => void;
}

const filterItems: Array<{ key: OrderFilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'ongoing', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'refunding', label: '退款' },
];

const matchesFilter = (order: DeliveryOrder, filter: OrderFilterKey): boolean => {
  const liveStatus = resolveOrderLiveStatus(order);

  if (filter === 'all') return true;
  if (filter === 'ongoing') return isOrderOngoing(liveStatus);
  if (filter === 'completed') return isOrderCompleted(liveStatus);
  return liveStatus === 'refunding' || order.afterSaleStatus === 'requested' || order.afterSaleStatus === 'processing';
};

export const TakeoutOrders: React.FC<TakeoutOrdersProps> = ({
  orders,
  isLoading = false,
  onOpenOrderDetail,
  onReorder,
  onUrge,
  onAfterSale,
  onRate,
  onDeleteOrder,
  onGoShopping,
}) => {
  const [activeFilter, setActiveFilter] = React.useState<OrderFilterKey>('all');

  const filteredOrders = React.useMemo(
    () => orders.filter((order) => matchesFilter(order, activeFilter)),
    [activeFilter, orders]
  );

  const hasAnyOrders = orders.length > 0;
  const isEmptyFiltered = filteredOrders.length === 0;

  return (
    <section className="space-y-4 pb-2">
      {/* 筛选标签 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white/90 p-3 shadow-sm"
      >
        <div className="grid grid-cols-4 gap-2">
          {filterItems.map((item) => (
            <motion.button
              key={item.key}
              whileTap={{ scale: 0.95 }}
              type="button"
              className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                activeFilter === item.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveFilter(item.key)}
            >
              {item.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* 订单列表 */}
      {isLoading ? (
        // 骨架屏加载状态
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonOrderCard key={i} />
          ))}
        </div>
      ) : !hasAnyOrders ? (
        // 没有任何订单
        <EmptyState
          icon="📋"
          title="还没有订单"
          description="快去挑选喜欢的美食，享受便捷外卖服务"
          actionLabel="去逛逛"
          onAction={onGoShopping}
        />
      ) : isEmptyFiltered ? (
        // 筛选后无结果
        <EmptyState
          icon="🔍"
          title="暂无相关订单"
          description={`"${filterItems.find((f) => f.key === activeFilter)?.label}" 分类下没有订单`}
          actionLabel="查看全部"
          onAction={() => setActiveFilter('all')}
        />
      ) : (
        // 订单列表
        <div className="space-y-3">
          {filteredOrders.map((order, index) => {
            const liveStatus = resolveOrderLiveStatus(order);
            const statusLabel = getOrderStatusLabel(liveStatus);

            return (
              <motion.article
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl bg-white/90 p-4 shadow-sm"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onOpenOrderDetail(order.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-800">{order.merchantName}</h3>
                    <span
                      className={`rounded-lg px-2 py-1 text-xs ${
                        liveStatus === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : liveStatus === 'cancelled'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
                  <p className="mt-2 text-xs text-gray-600">
                    共 {order.lines.length} 项商品，实付{' '}
                    <span className="font-semibold text-orange-600">{formatMoney(order.payableAmount)}</span>
                  </p>
                </button>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-200"
                    onClick={() => onOpenOrderDetail(order.id)}
                  >
                    查看详情
                  </button>

                  <button
                    type="button"
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-200"
                    onClick={() => onReorder(order.id)}
                  >
                    再来一单
                  </button>

                  {isOrderOngoing(liveStatus) ? (
                    <button
                      type="button"
                      className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600 active:bg-orange-100"
                      onClick={() => onUrge(order.id)}
                    >
                      催单（{order.urgeCount}）
                    </button>
                  ) : null}

                  {liveStatus === 'completed' && !order.rated ? (
                    <button
                      type="button"
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white active:bg-gray-800"
                      onClick={() => onRate(order.id)}
                    >
                      去评价
                    </button>
                  ) : null}

                  {liveStatus === 'completed' && order.rated && (
                    <span className="rounded-lg bg-green-50 px-3 py-1.5 text-xs text-green-600">
                      已评价 ⭐{order.ratingScore}
                    </span>
                  )}

                  {(liveStatus === 'completed' || liveStatus === 'cancelled') &&
                  order.afterSaleStatus === 'none' ? (
                    <button
                      type="button"
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 active:bg-gray-200"
                      onClick={() => onAfterSale(order.id)}
                    >
                      申请售后
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 active:bg-red-100"
                    onClick={() => onDeleteOrder(order.id)}
                  >
                    删除
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
};
