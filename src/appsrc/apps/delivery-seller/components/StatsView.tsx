import React, { useState } from 'react';
import { useDeliverySellerStore } from '../store/store';
import { formatPriceInt, formatNumber, formatRating, formatDateTime } from '../utils/formatters';
import type { StatsViewProps } from './index';
import type { StatsTimeRange } from '../types';

export const StatsView: React.FC<StatsViewProps> = ({ onBack }) => {
  const { 
    statsOverview, 
    setStatsTimeRange, 
    refreshStats, 
    orders, 
    products,
    revenueTrend,
    orderTrend,
    categorySales,
    reviews,
    loadReviews,
  } = useDeliverySellerStore();
  
  const [selectedRange, setSelectedRange] = useState<StatsTimeRange>('today');
  const [showExportOptions, setShowExportOptions] = useState(false);

  React.useEffect(() => {
    loadReviews();
  }, []);

  const handleRangeChange = (range: StatsTimeRange) => {
    setSelectedRange(range);
    setStatsTimeRange(range);
  };

  const handleExportData = (type: 'revenue' | 'orders' | 'all') => {
    console.log('Exporting data:', type);
    alert('数据导出功能（模拟）：数据已导出为 CSV 文件');
    setShowExportOptions(false);
  };

  // 渲染简单的趋势图表（使用 CSS）
  const renderTrendChart = (data: typeof revenueTrend, color: string) => {
    if (data.length === 0) return null;
    
    const maxValue = Math.max(...data.map((d) => Math.max(d.revenue, d.orders)), 1);
    const chartHeight = 120;
    
    return (
      <div className="trend-chart">
        <div className="chart-bars">
          {data.map((point, index) => {
            const height = (point.revenue / maxValue) * chartHeight;
            return (
              <div key={index} className="chart-bar-container">
                <div 
                  className="chart-bar" 
                  style={{ height: `${Math.max(height, 2)}px`, backgroundColor: color }}
                  title={`${point.label}: ${formatPriceInt(point.revenue)}`}
                />
                <span className="chart-label">{point.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染分类销量占比
  const renderCategorySales = () => {
    if (categorySales.length === 0) return null;
    
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];
    
    return (
      <div className="category-sales">
        {categorySales.map((cat, index) => (
          <div key={cat.categoryId} className="category-item">
            <div className="category-info">
              <span 
                className="category-color-dot" 
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="category-name">{cat.categoryName}</span>
            </div>
            <div className="category-stats">
              <span className="category-count">{cat.salesCount}单</span>
              <span className="category-percentage">{cat.percentage.toFixed(1)}%</span>
            </div>
            <div className="category-progress">
              <div 
                className="category-progress-bar"
                style={{ 
                  width: `${cat.percentage}%`,
                  backgroundColor: colors[index % colors.length]
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染评价列表
  const renderReviews = () => {
    const recentReviews = reviews.slice(0, 5);
    
    if (recentReviews.length === 0) {
      return <p className="hint">暂无评价</p>;
    }
    
    return (
      <div className="review-list-mini">
        {recentReviews.map((review) => (
          <div key={review.id} className={`review-item ${review.isBadReview ? 'bad-review' : ''}`}>
            <div className="review-header">
              <span className="review-user">{review.userName}</span>
              <div className="review-rating">
                {'⭐'.repeat(review.rating)}
              </div>
            </div>
            <p className="review-content">{review.content}</p>
            <span className="review-time">{formatDateTime(review.createdAt)}</span>
            {review.isBadReview && (
              <span className="bad-review-tag">差评预警</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="stats-view">
      <div className="detail-header">
        <button className="btn-icon back-btn" onClick={onBack}>
          ←
        </button>
        <h2 className="page-title">数据统计</h2>
        <button 
          className="btn btn-sm" 
          onClick={() => setShowExportOptions(!showExportOptions)}
        >
          📥 导出
        </button>
      </div>

      {/* 导出选项 */}
      {showExportOptions && (
        <div className="export-options">
          <button className="export-btn" onClick={() => handleExportData('revenue')}>
            导出营业额数据
          </button>
          <button className="export-btn" onClick={() => handleExportData('orders')}>
            导出订单数据
          </button>
          <button className="export-btn" onClick={() => handleExportData('all')}>
            导出全部数据
          </button>
        </div>
      )}

      {/* 时间范围选择 */}
      <div className="range-selector">
        <button
          className={`range-btn ${selectedRange === 'today' ? 'active' : ''}`}
          onClick={() => handleRangeChange('today')}
        >
          今日
        </button>
        <button
          className={`range-btn ${selectedRange === 'week' ? 'active' : ''}`}
          onClick={() => handleRangeChange('week')}
        >
          近 7 天
        </button>
        <button
          className={`range-btn ${selectedRange === 'month' ? 'active' : ''}`}
          onClick={() => handleRangeChange('month')}
        >
          近 30 天
        </button>
        <button
          className="range-btn"
          onClick={refreshStats}
          title="刷新数据"
        >
          🔄
        </button>
      </div>

      {/* 时间范围显示 */}
      {statsOverview && (
        <div className="range-info">
          <span>统计周期：{formatDateTime(statsOverview.startDate)} - {formatDateTime(statsOverview.endDate)}</span>
        </div>
      )}

      {/* 核心指标 */}
      <div className="stats-cards">
        <div className="stat-card primary">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">
              {statsOverview ? formatPriceInt(statsOverview.totalRevenue) : '-'}
            </div>
            <div className="stat-label">营业额</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">
              {statsOverview ? formatNumber(statsOverview.totalOrders) : '-'}
            </div>
            <div className="stat-label">订单数</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">
              {statsOverview ? formatNumber(statsOverview.totalCustomers) : '-'}
            </div>
            <div className="stat-label">顾客数</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">
              {statsOverview?.avgRating ? formatRating(statsOverview.avgRating) : '-'}
            </div>
            <div className="stat-label">平均评分</div>
          </div>
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="stats-charts">
        <section className="section">
          <h3 className="section-title">营业额趋势</h3>
          {renderTrendChart(revenueTrend, '#4CAF50')}
        </section>

        <section className="section">
          <h3 className="section-title">订单量趋势</h3>
          {renderTrendChart(orderTrend, '#2196F3')}
        </section>
      </div>

      {/* 分类销量占比 */}
      <section className="section">
        <h3 className="section-title">商品分类销量占比</h3>
        {renderCategorySales()}
      </section>

      {/* 详细数据 */}
      <div className="stats-details">
        {/* 订单分析 */}
        <section className="section">
          <h3 className="section-title">订单分析</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">成交订单</span>
              <span className="stat-value">
                {statsOverview ? formatNumber(statsOverview.totalOrders) : '-'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">新顾客</span>
              <span className="stat-value">
                {statsOverview ? formatNumber(statsOverview.newCustomers) : '-'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">完成率</span>
              <span className="stat-value">
                {statsOverview ? `${statsOverview.completionRate.toFixed(1)}%` : '-'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">客单价</span>
              <span className="stat-value">
                {statsOverview ? formatPriceInt(statsOverview.avgOrderValue) : '-'}
              </span>
            </div>
          </div>
        </section>

        {/* 评价统计 */}
        <section className="section">
          <h3 className="section-title">评价统计</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">评价总数</span>
              <span className="stat-value">
                {statsOverview ? formatNumber(statsOverview.totalRatings) : '-'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">平均评分</span>
              <span className="stat-value">
                {statsOverview?.avgRating ? formatRating(statsOverview.avgRating) : '-'}
              </span>
            </div>
          </div>
          
          {/* 评分分布 */}
          <div className="rating-distribution">
            {[5, 4, 3, 2, 1].map((score) => {
              const count = reviews.filter((r) => r.rating === score).length;
              const total = reviews.length || 1;
              const percentage = (count / total) * 100;
              return (
                <div key={score} className="rating-bar">
                  <span className="rating-score">{score}星</span>
                  <div className="rating-progress">
                    <div
                      className="rating-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="rating-count">{count}</span>
                </div>
              );
            })}
          </div>

          {/* 最近评价 */}
          <h4 className="subsection-title">最近评价</h4>
          {renderReviews()}
        </section>

        {/* 效率统计 */}
        <section className="section">
          <h3 className="section-title">效率统计</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">平均备餐时间</span>
              <span className="stat-value">
                {statsOverview ? `${statsOverview.avgPreparationMinutes}分钟` : '-'}
              </span>
            </div>
          </div>
        </section>

        {/* 商品统计 */}
        <section className="section">
          <h3 className="section-title">商品统计</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">商品总数</span>
              <span className="stat-value">{formatNumber(products.length)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">上架中</span>
              <span className="stat-value">
                {formatNumber(products.filter((p) => p.status === 'on').length)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">已下架</span>
              <span className="stat-value">
                {formatNumber(products.filter((p) => p.status === 'off').length)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">库存紧张</span>
              <span className="stat-value">
                {formatNumber(products.filter((p) => p.stock > 0 && p.stock < 10).length)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* 无数据提示 */}
      {!statsOverview && (
        <div className="empty-state">
          <p>暂无统计数据</p>
          <p className="hint">开始接单后，数据将自动统计</p>
        </div>
      )}
    </div>
  );
};
