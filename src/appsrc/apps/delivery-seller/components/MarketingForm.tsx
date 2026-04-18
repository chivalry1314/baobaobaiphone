import React, { useState, useEffect } from 'react';
import { useDeliverySellerStore } from '../store/store';
import { formatDateTime } from '../utils/formatters';
import type { MarketingCampaign, MarketingType } from '../types';

export interface MarketingFormProps {
  campaign?: MarketingCampaign;
  onSave?: () => void;
  onCancel?: () => void;
}

export const MarketingForm: React.FC<MarketingFormProps> = ({ campaign, onSave, onCancel }) => {
  const { addMarketingCampaign, updateMarketingCampaign, shopConfig } = useDeliverySellerStore();
  
  const [type, setType] = useState<MarketingType>('fullReduction');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(5);
  const [thresholdAmount, setThresholdAmount] = useState<number>(30);
  const [discountRate, setDiscountRate] = useState<number>(0.8);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState<number>(1000);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 编辑模式：填充现有数据
  useEffect(() => {
    if (campaign) {
      setType(campaign.type);
      setTitle(campaign.title);
      setDescription(campaign.description);
      setDiscountAmount(campaign.discountAmount || 5);
      setThresholdAmount(campaign.thresholdAmount || 30);
      setDiscountRate(campaign.discountRate || 0.8);
      setUsageLimit(campaign.usageLimit || 1000);
      
      const start = new Date(campaign.startTime);
      const end = new Date(campaign.endTime);
      setStartTime(start.toISOString().slice(0, 16));
      setEndTime(end.toISOString().slice(0, 16));
    } else {
      // 新建模式：设置默认时间
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setStartTime(now.toISOString().slice(0, 16));
      setEndTime(nextWeek.toISOString().slice(0, 16));
    }
  }, [campaign]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = '请输入活动标题';
    }
    
    if (type === 'fullReduction' || type === 'coupon') {
      if (!discountAmount || discountAmount <= 0) {
        newErrors.discountAmount = '优惠金额必须大于 0';
      }
      if (!thresholdAmount || thresholdAmount <= 0) {
        newErrors.thresholdAmount = '满减门槛必须大于 0';
      }
      if (thresholdAmount <= discountAmount) {
        newErrors.thresholdAmount = '满减门槛必须大于优惠金额';
      }
    }
    
    if (type === 'discount') {
      if (!discountRate || discountRate <= 0 || discountRate >= 1) {
        newErrors.discountRate = '折扣率必须在 0-1 之间';
      }
    }
    
    if (!startTime || !endTime) {
      newErrors.time = '请选择活动开始和结束时间';
    } else if (new Date(startTime) >= new Date(endTime)) {
      newErrors.time = '结束时间必须晚于开始时间';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const campaignData: MarketingCampaign = {
      id: campaign?.id || `campaign_${Date.now()}`,
      merchantId: shopConfig?.merchantId || 'merchant_1',
      type,
      title,
      description,
      discountAmount: (type === 'fullReduction' || type === 'coupon') ? discountAmount : undefined,
      thresholdAmount: (type === 'fullReduction' || type === 'coupon') ? thresholdAmount : undefined,
      discountRate: type === 'discount' ? discountRate : undefined,
      startTime: new Date(startTime).getTime(),
      endTime: new Date(endTime).getTime(),
      isActive: true,
      usageLimit,
      usedCount: campaign?.usedCount || 0,
      createdAt: campaign?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    if (campaign) {
      updateMarketingCampaign(campaign.id, campaignData);
    } else {
      addMarketingCampaign(campaignData);
    }

    onSave?.();
  };

  const getTypeLabel = (t: MarketingType): string => {
    const labels: Record<MarketingType, string> = {
      'discount': '折扣',
      'coupon': '优惠券',
      'fullReduction': '满减',
      'freeDelivery': '免配送费',
    };
    return labels[t] || t;
  };

  return (
    <div className="marketing-form">
      <h3 className="form-title">{campaign ? '编辑活动' : '新建活动'}</h3>
      
      <form onSubmit={handleSubmit}>
        {/* 活动类型 */}
        <div className="form-group">
          <label className="form-label">活动类型</label>
          <div className="type-selector">
            {(['fullReduction', 'discount', 'coupon', 'freeDelivery'] as MarketingType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`type-btn ${type === t ? 'active' : ''}`}
                onClick={() => setType(t)}
              >
                {getTypeLabel(t)}
              </button>
            ))}
          </div>
        </div>

        {/* 活动标题 */}
        <div className="form-group">
          <label className="form-label">活动标题 *</label>
          <input
            type="text"
            className={`form-input ${errors.title ? 'error' : ''}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：满 30 减 5 优惠"
          />
          {errors.title && <span className="form-error">{errors.title}</span>}
        </div>

        {/* 活动描述 */}
        <div className="form-group">
          <label className="form-label">活动描述</label>
          <textarea
            className="form-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="活动详细说明"
            rows={3}
          />
        </div>

        {/* 满减配置 */}
        {(type === 'fullReduction' || type === 'coupon') && (
          <>
            <div className="form-group">
              <label className="form-label">满减门槛（元）*</label>
              <input
                type="number"
                className={`form-input ${errors.thresholdAmount ? 'error' : ''}`}
                value={thresholdAmount}
                onChange={(e) => setThresholdAmount(Number(e.target.value))}
                min="1"
              />
              {errors.thresholdAmount && <span className="form-error">{errors.thresholdAmount}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">优惠金额（元）*</label>
              <input
                type="number"
                className={`form-input ${errors.discountAmount ? 'error' : ''}`}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                min="1"
              />
              {errors.discountAmount && <span className="form-error">{errors.discountAmount}</span>}
            </div>
          </>
        )}

        {/* 折扣配置 */}
        {type === 'discount' && (
          <div className="form-group">
            <label className="form-label">折扣率 *</label>
            <input
              type="number"
              className={`form-input ${errors.discountRate ? 'error' : ''}`}
              value={discountRate}
              onChange={(e) => setDiscountRate(Number(e.target.value))}
              step="0.1"
              min="0.1"
              max="0.9"
            />
            <span className="form-hint">{(discountRate * 10).toFixed(1)}折</span>
            {errors.discountRate && <span className="form-error">{errors.discountRate}</span>}
          </div>
        )}

        {/* 活动周期 */}
        <div className="form-group">
          <label className="form-label">活动周期 *</label>
          <div className="time-range">
            <div className="time-field">
              <span className="time-label">开始</span>
              <input
                type="datetime-local"
                className={`form-input ${errors.time ? 'error' : ''}`}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="time-field">
              <span className="time-label">结束</span>
              <input
                type="datetime-local"
                className={`form-input ${errors.time ? 'error' : ''}`}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          {errors.time && <span className="form-error">{errors.time}</span>}
        </div>

        {/* 发放数量 */}
        <div className="form-group">
          <label className="form-label">发放数量限制</label>
          <input
            type="number"
            className="form-input"
            value={usageLimit}
            onChange={(e) => setUsageLimit(Number(e.target.value))}
            min="1"
          />
          <span className="form-hint">设置为 0 表示不限制</span>
        </div>

        {/* 操作按钮 */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="btn btn-primary">
            {campaign ? '保存修改' : '创建活动'}
          </button>
        </div>
      </form>
    </div>
  );
};
