import React, { useMemo } from 'react';
import { useDeliverySellerStore } from '../store/store';
import { formatPriceInt, formatNumber, formatRating } from '../utils/formatters';
import type { SellerHomeProps } from './index';

export const SellerHome: React.FC<SellerHomeProps> = ({ onNavigate }) => {
  const { shopConfig, shopStatus, orders, products, statsOverview, toggleShopOpen } = useDeliverySellerStore();

  // 热销商品 Top 5
  const topProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => b.monthlySales - a.monthlySales)
      .slice(0, 5);
  }, [products]);

  // 计算今日订单统计
  const todayOrders = orders.filter((o) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return o.createdAt >= today.getTime();
  });

  const pendingCount = orders.filter((o) => o.status === 'paid' || o.status === 'accepted').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const deliveringCount = orders.filter((o) => o.status === 'delivering').length;
  const todayRevenue = todayOrders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + o.payableAmount, 0);

  return (
    <div className="seller-home">
      {/* 店铺状态卡片 */}
      <div className="shop-status-card">
        <div className="shop-info">
          <h2 className="shop-name">{shopConfig?.name || '店铺名称'}</h2>
          <p className="shop-description">{shopConfig?.description || ''}</p>
        </div>
        <div className="shop-status">
          <span className={`status-badge ${shopStatus.isOpen ? 'open' : 'closed'}`}>
            {shopStatus.isOpen ? '营业中' : '休息中'}
          </span>
          <button
            className="toggle-btn"
            onClick={toggleShopOpen}
          >
            {shopStatus.isOpen ? '打烊' : '营业'}
          </button>
        </div>
      </div>

      {/* 今日数据概览 */}
      <div className="stats-overview">
        <div className="stat-item">
          <div className="stat-value">{formatPriceInt(todayRevenue)}</div>
          <div className="stat-label">今日营业额</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatNumber(todayOrders.length)}</div>
          <div className="stat-label">今日订单</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {statsOverview?.avgRating ? formatRating(statsOverview.avgRating) : '-'}
          </div>
          <div className="stat-label">店铺评分</div>
        </div>
      </div>

      {/* 订单状态快捷入口 */}
      <div className="order-quick-actions">
        <h3 className="section-title">订单管理</h3>
        <div className="action-grid">
          <button
            className="action-card pending"
            onClick={() => onNavigate?.('order-list', { filter: 'pending' })}
          >
            <div className="action-count">{pendingCount}</div>
            <div className="action-label">待处理</div>
          </button>
          <button
            className="action-card preparing"
            onClick={() => onNavigate?.('order-list', { filter: 'preparing' })}
          >
            <div className="action-count">{preparingCount}</div>
            <div className="action-label">制作中</div>
          </button>
          <button
            className="action-card delivering"
            onClick={() => onNavigate?.('order-list', { filter: 'delivering' })}
          >
            <div className="action-count">{deliveringCount}</div>
            <div className="action-label">配送中</div>
          </button>
          <button
            className="action-card all"
            onClick={() => onNavigate?.('order-list', { filter: 'all' })}
          >
            <div className="action-count">{orders.length}</div>
            <div className="action-label">全部订单</div>
          </button>
        </div>
      </div>

      {/* 热销商品 Top 5 */}
      <div className="top-products">
        <h3 className="section-title">🔥 热销商品 Top 5</h3>
        <div className="product-rank-list">
          {topProducts.map((product, index) => (
            <div key={product.id} className="rank-item">
              <span className={`rank-number ${index < 3 ? 'top' : ''}`}>
                {index + 1}
              </span>
              <div className="rank-info">
                <span className="rank-name">{product.name}</span>
                <span className="rank-sales">月售 {product.monthlySales}</span>
              </div>
              <span className="rank-price">{formatPriceInt(product.price)}</span>
            </div>
          ))}
          {topProducts.length === 0 && (
            <p className="empty-hint">暂无销售数据</p>
          )}
        </div>
      </div>

      {/* 快捷功能 */}
      <div className="quick-functions">
        <h3 className="section-title">快捷功能</h3>
        <div className="function-list">
          <button
            className="function-item"
            onClick={() => onNavigate?.('product-list')}
          >
            <span className="function-icon">📦</span>
            <span className="function-label">商品管理</span>
          </button>
          <button
            className="function-item"
            onClick={() => onNavigate?.('shop-manage')}
          >
            <span className="function-icon">🏪</span>
            <span className="function-label">店铺设置</span>
          </button>
          <button
            className="function-item"
            onClick={() => onNavigate?.('marketing-manage')}
          >
            <span className="function-icon">🎉</span>
            <span className="function-label">营销活动</span>
          </button>
          <button
            className="function-item"
            onClick={() => onNavigate?.('stats-view')}
          >
            <span className="function-icon">📊</span>
            <span className="function-label">数据统计</span>
          </button>
        </div>
      </div>
    </div>
  );
};
