import React, { useState } from 'react';
import { useDeliverySellerStore } from '../store/store';
import { formatDateTime, formatDiscountRate } from '../utils/formatters';
import type { MarketingManageProps } from './index';
import type { MarketingCampaign, MarketingType } from '../types';
import { MarketingForm } from './MarketingForm';

export const MarketingManage: React.FC<MarketingManageProps> = ({ onBack }) => {
  const { marketingCampaigns, addMarketingCampaign, updateMarketingCampaign, deleteMarketingCampaign, toggleCampaignActive } = useDeliverySellerStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();

  const activeCampaigns = marketingCampaigns.filter((c) => c.isActive);
  const inactiveCampaigns = marketingCampaigns.filter((c) => !c.isActive);

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个营销活动吗？')) {
      deleteMarketingCampaign(id);
    }
  };

  const getTypeLabel = (type: MarketingType): string => {
    const labels: Record<MarketingType, string> = {
      'discount': '折扣',
      'coupon': '优惠券',
      'fullReduction': '满减',
      'freeDelivery': '免配送费',
    };
    return labels[type] || type;
  };

  const getStatusText = (campaign: MarketingCampaign): string => {
    const now = Date.now();
    if (!campaign.isActive) return '未激活';
    if (now < campaign.startTime) return '未开始';
    if (now > campaign.endTime) return '已结束';
    return '进行中';
  };

  return (
    <div className="marketing-manage">
      <div className="detail-header">
        <button className="btn-icon back-btn" onClick={onBack}>
          ←
        </button>
        <h2 className="page-title">营销活动</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + 新建活动
        </button>
      </div>

      {/* 活动统计 */}
      <div className="marketing-stats">
        <div className="stat-item">
          <span className="stat-count">{activeCampaigns.length}</span>
          <span className="stat-label">进行中</span>
        </div>
        <div className="stat-item">
          <span className="stat-count">{inactiveCampaigns.length}</span>
          <span className="stat-label">未激活</span>
        </div>
      </div>

      {/* 进行中的活动 */}
      {activeCampaigns.length > 0 && (
        <section className="section">
          <h3 className="section-title">进行中的活动</h3>
          <div className="campaign-list">
            {activeCampaigns.map((campaign) => (
              <div key={campaign.id} className="campaign-card active">
                <div className="campaign-header">
                  <span className={`campaign-type type-${campaign.type}`}>
                    {getTypeLabel(campaign.type)}
                  </span>
                  <span className="campaign-status">{getStatusText(campaign)}</span>
                </div>
                <h4 className="campaign-title">{campaign.title}</h4>
                <p className="campaign-desc">{campaign.description}</p>
                
                <div className="campaign-details">
                  {campaign.discountAmount && (
                    <div className="detail-row">
                      <span>优惠金额：</span>
                      <span className="highlight">¥{campaign.discountAmount}</span>
                    </div>
                  )}
                  {campaign.thresholdAmount && (
                    <div className="detail-row">
                      <span>满减门槛：</span>
                      <span>满¥{campaign.thresholdAmount}</span>
                    </div>
                  )}
                  {campaign.discountRate && (
                    <div className="detail-row">
                      <span>折扣率：</span>
                      <span className="highlight">{formatDiscountRate(campaign.discountRate)}</span>
                    </div>
                  )}
                  {campaign.usageLimit && (
                    <div className="detail-row">
                      <span>使用情况：</span>
                      <span>{campaign.usedCount} / {campaign.usageLimit}</span>
                    </div>
                  )}
                </div>

                <div className="campaign-time">
                  <span>有效期：{formatDateTime(campaign.startTime)} - {formatDateTime(campaign.endTime)}</span>
                </div>

                <div className="campaign-actions">
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      setEditingId(campaign.id);
                      setShowForm(true);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={() => toggleCampaignActive(campaign.id)}
                  >
                    停用
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(campaign.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 未激活的活动 */}
      {inactiveCampaigns.length > 0 && (
        <section className="section">
          <h3 className="section-title">未激活的活动</h3>
          <div className="campaign-list">
            {inactiveCampaigns.map((campaign) => (
              <div key={campaign.id} className="campaign-card inactive">
                <div className="campaign-header">
                  <span className={`campaign-type type-${campaign.type}`}>
                    {getTypeLabel(campaign.type)}
                  </span>
                  <span className="campaign-status">{getStatusText(campaign)}</span>
                </div>
                <h4 className="campaign-title">{campaign.title}</h4>
                <p className="campaign-desc">{campaign.description}</p>
                
                <div className="campaign-time">
                  <span>有效期：{formatDateTime(campaign.startTime)} - {formatDateTime(campaign.endTime)}</span>
                </div>

                <div className="campaign-actions">
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      setEditingId(campaign.id);
                      setShowForm(true);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => toggleCampaignActive(campaign.id)}
                  >
                    启用
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(campaign.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 无活动提示 */}
      {marketingCampaigns.length === 0 && (
        <div className="empty-state">
          <p>暂无营销活动</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            创建第一个活动
          </button>
        </div>
      )}

      {/* 新建/编辑表单 */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <MarketingForm
              campaign={editingId ? marketingCampaigns.find((c) => c.id === editingId) : undefined}
              onSave={() => {
                setShowForm(false);
                setEditingId(undefined);
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingId(undefined);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
