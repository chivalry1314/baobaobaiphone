import React, { useState } from 'react';
import { useDeliverySellerStore } from '../store/store';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';
import type { UserReview, ReviewFilter } from '../types';

export interface ReviewManageProps {
  onBack?: () => void;
}

export const ReviewManage: React.FC<ReviewManageProps> = ({ onBack }) => {
  const { reviews, addReviewReply, setReviewFilter, reviewFilter, badReviewCount, loadReviews } = useDeliverySellerStore();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  React.useEffect(() => {
    loadReviews();
  }, []);

  const handleReply = (reviewId: string) => {
    if (replyContent.trim()) {
      addReviewReply(reviewId, replyContent);
      setReplyingTo(null);
      setReplyContent('');
    }
  };

  const getFilteredReviews = (): UserReview[] => {
    switch (reviewFilter) {
      case 'good':
        return reviews.filter((r) => r.rating >= 4);
      case 'normal':
        return reviews.filter((r) => r.rating === 3);
      case 'bad':
        return reviews.filter((r) => r.rating <= 2);
      default:
        return reviews;
    }
  };

  const getFilterLabel = (filter: ReviewFilter): string => {
    const labels: Record<ReviewFilter, string> = {
      'all': '全部',
      'good': '好评',
      'normal': '中评',
      'bad': '差评',
    };
    return labels[filter] || filter;
  };

  const filteredReviews = getFilteredReviews();

  return (
    <div className="review-manage">
      <div className="detail-header">
        <button className="btn-icon back-btn" onClick={onBack}>
          ←
        </button>
        <h2 className="page-title">评价管理</h2>
      </div>

      {/* 评价统计 */}
      <div className="review-stats">
        <div className="stat-card">
          <span className="stat-count">{reviews.length}</span>
          <span className="stat-label">评价总数</span>
        </div>
        <div className="stat-card good">
          <span className="stat-count">{reviews.filter((r) => r.rating >= 4).length}</span>
          <span className="stat-label">好评</span>
        </div>
        <div className="stat-card normal">
          <span className="stat-count">{reviews.filter((r) => r.rating === 3).length}</span>
          <span className="stat-label">中评</span>
        </div>
        <div className="stat-card bad">
          <span className="stat-count">{badReviewCount}</span>
          <span className="stat-label">差评</span>
        </div>
      </div>

      {/* 差评预警 */}
      {badReviewCount > 0 && (
        <div className="bad-review-alert">
          <span className="alert-icon">⚠️</span>
          <span className="alert-text">
            当前有 <strong>{badReviewCount}</strong> 条差评，请及时处理
          </span>
        </div>
      )}

      {/* 筛选器 */}
      <div className="filter-bar">
        {(['all', 'good', 'normal', 'bad'] as ReviewFilter[]).map((filter) => (
          <button
            key={filter}
            className={`filter-btn ${reviewFilter === filter ? 'active' : ''}`}
            onClick={() => setReviewFilter(filter)}
          >
            {getFilterLabel(filter)}
          </button>
        ))}
      </div>

      {/* 评价列表 */}
      <div className="review-list">
        {filteredReviews.length === 0 ? (
          <div className="empty-state">
            <p>暂无评价</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div 
              key={review.id} 
              className={`review-card ${review.isBadReview ? 'bad-review-card' : ''}`}
            >
              <div className="review-header">
                <div className="review-user-info">
                  <div className="review-avatar">
                    {review.userAvatar || '👤'}
                  </div>
                  <div className="review-user-details">
                    <span className="review-user-name">{review.userName}</span>
                    <span className="review-time">{formatRelativeTime(review.createdAt)}</span>
                  </div>
                </div>
                <div className="review-rating">
                  {'⭐'.repeat(review.rating)}
                </div>
              </div>

              <div className="review-content-section">
                <p className="review-content">{review.content}</p>
                
                {/* 评价图片 */}
                {review.images && review.images.length > 0 && (
                  <div className="review-images">
                    {review.images.map((img, index) => (
                      <div key={index} className="review-image">
                        <img src={img || '/placeholder.jpg'} alt="评价图片" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 商家回复 */}
              {review.replyContent ? (
                <div className="merchant-reply">
                  <div className="reply-header">
                    <span className="reply-icon">👨‍💼</span>
                    <span className="reply-label">商家回复</span>
                    <span className="reply-time">{formatDateTime(review.replyAt!)}</span>
                  </div>
                  <p className="reply-content">{review.replyContent}</p>
                </div>
              ) : (
                <div className="reply-prompt">
                  {replyingTo === review.id ? (
                    <div className="reply-form">
                      <textarea
                        className="reply-input"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="回复评价..."
                        rows={3}
                        autoFocus
                      />
                      <div className="reply-actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                        >
                          取消
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleReply(review.id)}
                        >
                          提交回复
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-sm btn-reply"
                      onClick={() => setReplyingTo(review.id)}
                    >
                      💬 回复
                    </button>
                  )}
                </div>
              )}

              {/* 差评标签 */}
              {review.isBadReview && (
                <span className="bad-review-badge">差评预警</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
