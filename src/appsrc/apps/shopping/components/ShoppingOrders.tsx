import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ListOrdered, Package, RotateCcw, Truck, Wallet } from 'lucide-react';
import type { Order } from '../types';
import { formatDateTime, formatMoney, getOrderStatus } from '../utils';
import styles from '../ShoppingApp.module.css';

interface ShoppingOrdersProps {
  orders: Order[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onOpenOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onGoHome: () => void;
}

const SWIPE_ACTION_WIDTH = 148;
const SWIPE_OPEN_THRESHOLD = 64;

type OrderFilterKey =
  | 'all'
  | 'pending-pay'
  | 'pending-ship'
  | 'pending-receive'
  | 'after-sale';

type OrderFilterItem = {
  key: OrderFilterKey;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
};

const orderFilterItems: OrderFilterItem[] = [
  { key: 'all', label: '全部', icon: ListOrdered },
  { key: 'pending-pay', label: '待付款', icon: Wallet },
  { key: 'pending-ship', label: '待发货', icon: Package },
  { key: 'pending-receive', label: '待收货', icon: Truck },
  { key: 'after-sale', label: '退款', icon: RotateCcw },
];

const normalizeMetaStatus = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const isPendingPay = (order: Order) => {
  const rawStatus = normalizeMetaStatus(order.meta?.paymentStatus ?? order.meta?.payStatus ?? order.meta?.status);
  return ['unpaid', 'pending', 'pending-pay', 'to-pay', 'paying', '待付款'].includes(rawStatus);
};

const isPendingShip = (order: Order) => {
  if (order.kind === 'movie') return false;
  return getOrderStatus(order) === '等待发货';
};

const isPendingReceive = (order: Order) => {
  if (order.kind === 'movie') return false;
  return ['已发货', '运输中', '派送中'].includes(getOrderStatus(order));
};

const isAfterSale = (order: Order) => {
  const rawStatus = normalizeMetaStatus(
    order.meta?.afterSaleStatus ?? order.meta?.refundStatus ?? order.meta?.status
  );
  return [
    'after-sale',
    'after_sale',
    'aftersale',
    'refund',
    'refunding',
    'refunded',
    'processing',
    'pending',
    '售后',
    '退款',
  ].includes(rawStatus);
};

const matchOrderFilter = (order: Order, filterKey: OrderFilterKey) => {
  switch (filterKey) {
    case 'pending-pay':
      return isPendingPay(order);
    case 'pending-ship':
      return isPendingShip(order);
    case 'pending-receive':
      return isPendingReceive(order);
    case 'after-sale':
      return isAfterSale(order);
    case 'all':
    default:
      return true;
  }
};

export const ShoppingOrders: React.FC<ShoppingOrdersProps> = ({
  orders,
  scrollRef,
  onOpenOrder,
  onDeleteOrder,
  onGoHome
}) => {
  const [activeFilter, setActiveFilter] = React.useState<OrderFilterKey>('all');
  const [openOrderId, setOpenOrderId] = React.useState<string | null>(null);
  const [draggingOrderId, setDraggingOrderId] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState(0);
  const pointerIdRef = React.useRef<number | null>(null);
  const dragStartXRef = React.useRef(0);
  const dragStartYRef = React.useRef(0);
  const dragBaseOffsetRef = React.useRef(0);
  const isHorizontalDragRef = React.useRef(false);
  const suppressClickRef = React.useRef(false);

  const filteredOrders = React.useMemo(
    () => orders.filter((order) => matchOrderFilter(order, activeFilter)),
    [orders, activeFilter]
  );

  const filterCounts = React.useMemo(() => {
    const counts: Record<OrderFilterKey, number> = {
      all: orders.length,
      'pending-pay': 0,
      'pending-ship': 0,
      'pending-receive': 0,
      'after-sale': 0,
    };
    orders.forEach((order) => {
      if (isPendingPay(order)) counts['pending-pay'] += 1;
      if (isPendingShip(order)) counts['pending-ship'] += 1;
      if (isPendingReceive(order)) counts['pending-receive'] += 1;
      if (isAfterSale(order)) counts['after-sale'] += 1;
    });
    return counts;
  }, [orders]);

  const virtualizer = useVirtualizer({
    count: filteredOrders.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 156,
    overscan: 8,
  });

  React.useEffect(() => {
    if (!openOrderId) return;
    if (filteredOrders.some((order) => order.id === openOrderId)) return;
    setOpenOrderId(null);
  }, [openOrderId, filteredOrders]);

  const beginDrag = (orderId: string, x: number, y: number) => {
    if (openOrderId && openOrderId !== orderId) setOpenOrderId(null);
    setDraggingOrderId(orderId);
    dragStartXRef.current = x;
    dragStartYRef.current = y;
    dragBaseOffsetRef.current = openOrderId === orderId ? SWIPE_ACTION_WIDTH : 0;
    isHorizontalDragRef.current = false;
    suppressClickRef.current = false;
    setDragOffset(dragBaseOffsetRef.current);
  };

  const updateDrag = (x: number, y: number) => {
    if (!draggingOrderId) return;
    const deltaX = x - dragStartXRef.current;
    const deltaY = y - dragStartYRef.current;
    if (!isHorizontalDragRef.current) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      isHorizontalDragRef.current = Math.abs(deltaX) >= Math.abs(deltaY);
    }
    if (!isHorizontalDragRef.current) return;
    suppressClickRef.current = true;
    const next = Math.max(0, Math.min(SWIPE_ACTION_WIDTH, dragBaseOffsetRef.current + deltaX));
    setDragOffset(next);
  };

  const endDrag = () => {
    if (!draggingOrderId) return;
    const shouldOpen = dragOffset >= SWIPE_OPEN_THRESHOLD;
    setOpenOrderId(shouldOpen ? draggingOrderId : null);
    setDraggingOrderId(null);
    setDragOffset(0);
    pointerIdRef.current = null;
    isHorizontalDragRef.current = false;
  };

  const resolveOffset = (orderId: string) => {
    if (draggingOrderId === orderId) return dragOffset;
    return openOrderId === orderId ? SWIPE_ACTION_WIDTH : 0;
  };

  return (
    <section className={styles.section}>
      <div className={styles.orderFilterGrid}>
        {orderFilterItems.map((item) => {
          const Icon = item.icon;
          const count = filterCounts[item.key];
          return (
            <button
              key={item.key}
              type="button"
              className={`${styles.orderFilterItem} ${activeFilter === item.key ? styles.orderFilterItemActive : ''}`}
              onClick={() => setActiveFilter(item.key)}
            >
              <div className={styles.orderFilterIcon}>
                {item.key !== 'all' && count > 0 ? <span className={styles.orderFilterBadge}>{count}</span> : null}
                <Icon size={20} />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div className={styles.empty}>
          <p>还没有订单。</p>
          <button className={styles.primaryBtn} onClick={onGoHome}>
            去逛逛
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className={styles.empty}>
          <p>暂无该分类订单。</p>
        </div>
      ) : (
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const order = filteredOrders[virtualItem.index];
            if (!order) return null;
            return (
              <div
                key={order.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  paddingBottom: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <div className={styles.orderSwipeRow}>
                  <div className={styles.orderSwipeActions}>
                    <button
                      type="button"
                      className={styles.orderSwipeActionDanger}
                      onClick={(event) => {
                        event.stopPropagation();
                        const confirmed = window.confirm('删除后订单无法恢复，确认删除该订单吗？');
                        if (!confirmed) return;
                        setOpenOrderId(null);
                        onDeleteOrder(order.id);
                      }}
                    >
                      删除
                    </button>
                    <button
                      type="button"
                      className={styles.orderSwipeAction}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenOrderId(null);
                      }}
                    >
                      取消
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.orderCard}
                    style={{
                      transform: `translateX(${resolveOffset(order.id)}px)`,
                      transition: draggingOrderId === order.id ? 'none' : 'transform 0.2s ease',
                      touchAction: 'pan-y'
                    }}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      pointerIdRef.current = event.pointerId;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      beginDrag(order.id, event.clientX, event.clientY);
                    }}
                    onPointerMove={(event) => {
                      if (pointerIdRef.current !== event.pointerId) return;
                      updateDrag(event.clientX, event.clientY);
                    }}
                    onPointerUp={(event) => {
                      if (pointerIdRef.current !== event.pointerId) return;
                      event.currentTarget.releasePointerCapture(event.pointerId);
                      endDrag();
                    }}
                    onPointerCancel={(event) => {
                      if (pointerIdRef.current !== event.pointerId) return;
                      event.currentTarget.releasePointerCapture(event.pointerId);
                      endDrag();
                    }}
                    onClick={() => {
                      if (suppressClickRef.current) {
                        suppressClickRef.current = false;
                        return;
                      }
                      if (openOrderId === order.id) {
                        setOpenOrderId(null);
                        return;
                      }
                      onOpenOrder(order.id);
                    }}
                  >
                    <div className={styles.orderCardTop}>
                      <div className={styles.orderTitle}>
                        <strong>{order.title}</strong>
                        <span>{getOrderStatus(order)}</span>
                      </div>
                      <div className={styles.orderMeta}>{formatDateTime(order.createdAt)}</div>
                    </div>
                    <div className={styles.orderCardBody}>
                      <div className={styles.orderLines}>
                        {order.lines.slice(0, 2).map((line) => (
                          <div key={line.name}>
                            <span>{line.name}</span>
                            <em>x{line.qty}</em>
                          </div>
                        ))}
                        {order.lines.length > 2 && <div className={styles.orderMore}>...等 {order.lines.length} 项</div>}
                      </div>
                      <div className={styles.orderTotal}>{formatMoney(order.total)}</div>
                    </div>
                    <div className={styles.orderCardFoot}>
                      <span className={styles.orderId}>订单号 {order.id}</span>
                      <span className={styles.orderHint}>查看详情</span>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
