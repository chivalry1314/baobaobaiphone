import React, { useMemo, useEffect } from 'react';
import { useDeliverySellerStore } from '../store/store';
import { formatDateTime, formatPriceInt, formatOrderStatus, formatRelativeTime } from '../utils/formatters';
import { useToast } from './ui';
import type { OrderListProps } from './index';

export const OrderList: React.FC<OrderListProps> = ({ onViewDetail, initialFilter = 'all' }) => {
  const {
    orders,
    orderFilter,
    orderSearchKeyword,
    setOrderFilter,
    setOrderSearchKeyword,
    acceptOrder,
    startPreparingOrder,
    completePreparation,
    completeOrder,
    rejectOrder,
    newOrderCount,
    clearNewOrderCount,
  } = useDeliverySellerStore();

  const { success, warning, error, ToastComponent } = useToast();

  // 新订单提醒音效（模拟）
  useEffect(() => {
    if (newOrderCount > 0) {
      // 实际项目中可以播放提示音
      // const audio = new Audio('/notification.mp3');
      // audio.play().catch(() => {});
      success(`收到 ${newOrderCount} 个新订单！`);
    }
  }, [newOrderCount]);

  // 过滤订单
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 状态过滤
      if (orderFilter !== 'all') {
        if (orderFilter === 'pending' && order.status !== 'paid' && order.status !== 'accepted') return false;
        if (orderFilter === 'preparing' && order.status !== 'preparing') return false;
        if (orderFilter === 'delivering' && order.status !== 'delivering') return false;
        if (orderFilter === 'completed' && order.status !== 'completed') return false;
        if (orderFilter === 'cancelled' && order.status !== 'cancelled') return false;
      }

      // 搜索过滤
      if (orderSearchKeyword) {
        const keyword = orderSearchKeyword.toLowerCase();
        return (
          order.id.toLowerCase().includes(keyword) ||
          order.address.name.toLowerCase().includes(keyword) ||
          order.address.phone.includes(keyword)
        );
      }

      return true;
    });
  }, [orders, orderFilter, orderSearchKeyword]);

  // 按状态排序（待处理优先）
  const sortedOrders = useMemo(() => {
    const statusPriority: Record<string, number> = {
      'paid': 1,
      'accepted': 2,
      'preparing': 3,
      'delivering': 4,
      'completed': 5,
      'cancelled': 6,
    };

    return [...filteredOrders].sort((a, b) => {
      // 未完成订单优先
      const aPending = ['paid', 'accepted', 'preparing', 'delivering'].includes(a.status);
      const bPending = ['paid', 'accepted', 'preparing', 'delivering'].includes(b.status);
      
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      
      // 同状态按时间倒序
      return b.createdAt - a.createdAt;
    });
  }, [filteredOrders]);

  const handleQuickAction = (orderId: string, currentStatus: string) => {
    switch (currentStatus) {
      case 'paid':
        acceptOrder(orderId);
        success('已接单');
        break;
      case 'accepted':
        startPreparingOrder(orderId);
        success('开始制作');
        break;
      case 'preparing':
        completePreparation(orderId);
        success('已出餐');
        break;
      case 'delivering':
        completeOrder(orderId);
        success('订单已完成');
        break;
    }
  };

  const getQuickActionLabel = (status: string): string => {
    switch (status) {
      case 'paid': return '接单';
      case 'accepted': return '开始制作';
      case 'preparing': return '出餐';
      case 'delivering': return '完成订单';
      default: return '';
    }
  };

  const handleRejectOrder = (orderId: string) => {
    const reason = prompt('请输入拒单原因：');
    if (reason) {
      rejectOrder(orderId, reason);
      warning('已拒单');
      clearNewOrderCount();
    }
  };

  return (
    <div className="order-list">
      <div className="list-header">
        <h2 className="page-title">订单管理</h2>
        {newOrderCount > 0 && (
          <span className="new-order-badge">{newOrderCount} 新订单</span>
        )}
      </div>

      {/* 搜索和筛选 */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索订单号、顾客姓名或手机号..."
          value={orderSearchKeyword}
          onChange={(e) => setOrderSearchKeyword(e.target.value)}
        />
        <select
          className="filter-select"
          value={orderFilter}
          onChange={(e) => setOrderFilter(e.target.value as any)}
        >
          <option value="all">全部</option>
          <option value="pending">待处理</option>
          <option value="preparing">制作中</option>
          <option value="delivering">配送中</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      {/* 订单统计 */}
      <div className="order-stats">
        <div className="stat-badge">
          <span className="stat-count">
            {orders.filter((o) => o.status === 'paid' || o.status === 'accepted').length}
          </span>
          <span className="stat-label">待处理</span>
        </div>
        <div className="stat-badge">
          <span className="stat-count">
            {orders.filter((o) => o.status === 'preparing').length}
          </span>
          <span className="stat-label">制作中</span>
        </div>
        <div className="stat-badge">
          <span className="stat-count">
            {orders.filter((o) => o.status === 'delivering').length}
          </span>
          <span className="stat-label">配送中</span>
        </div>
      </div>

      {/* 订单列表 */}
      {sortedOrders.length === 0 ? (
        <div className="empty-state">
          <p>暂无订单</p>
        </div>
      ) : (
        <div className="order-items">
          {sortedOrders.map((order) => (
            <div key={order.id} className={`order-item ${order.status}`}>
              <div className="order-header">
                <span className="order-id">订单号：{order.id}</span>
                <span className="order-time">{formatRelativeTime(order.createdAt)}</span>
              </div>

              <div className="order-content">
                <div className="order-items-preview">
                  {order.lines.map((line) => (
                    <div key={line.id} className="order-line">
                      <span className="line-qty">x{line.qty}</span>
                      <span className="line-name">{line.dishName}</span>
                      {line.note && <span className="line-note">（备注：{line.note}）</span>}
                    </div>
                  ))}
                </div>

                <div className="order-customer">
                  <span>{order.address.name}</span>
                  <span>{order.address.phone}</span>
                  {order.deliveryTimeMode === 'schedule' && order.scheduleAt && (
                    <span className="schedule-tag">预约：{formatDateTime(order.scheduleAt)}</span>
                  )}
                </div>

                <div className="order-footer">
                  <span className="order-amount">{formatPriceInt(order.payableAmount)}</span>
                  <span className={`order-status status-${order.status}`}>
                    {formatOrderStatus(order.status)}
                  </span>
                </div>
              </div>

              <div className="order-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => onViewDetail?.(order.id)}
                >
                  查看详情
                </button>
                {['paid', 'accepted', 'preparing', 'delivering'].includes(order.status) && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleQuickAction(order.id, order.status)}
                  >
                    {getQuickActionLabel(order.status)}
                  </button>
                )}
                {['paid', 'accepted', 'preparing'].includes(order.status) && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRejectOrder(order.id)}
                  >
                    拒单
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ToastComponent />
    </div>
  );
};
