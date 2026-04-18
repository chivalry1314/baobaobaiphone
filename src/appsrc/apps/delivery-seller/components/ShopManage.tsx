import React, { useState } from 'react';
import { useDeliverySellerStore } from '../store/store';
import { formatOpeningHour } from '../utils/formatters';
import { useToast } from './ui';
import type { ShopManageProps } from './index';
import type { ShopConfig } from '../types';

export const ShopManage: React.FC<ShopManageProps> = ({ onSave }) => {
  const { shopConfig, shopStatus, updateShopStatus, toggleBusyMode, setShopConfig } = useDeliverySellerStore();
  const { success } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ShopConfig>>({});

  if (!shopConfig) {
    return <div className="shop-manage">加载中...</div>;
  }

  const handleStartEdit = () => {
    setEditForm({
      name: shopConfig.name,
      description: shopConfig.description,
      announcement: shopConfig.announcement,
      notice: shopConfig.notice,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editForm.name || editForm.description || editForm.announcement || editForm.notice) {
      setShopConfig({
        ...shopConfig,
        ...editForm,
      } as ShopConfig);
      success('店铺信息已更新');
      setIsEditing(false);
      onSave?.();
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleImageUpload = (field: 'logo' | 'cover') => {
    const url = prompt(`请输入${field === 'logo' ? '店铺 Logo' : '店铺头图'}的 URL:`);
    if (url) {
      setShopConfig({
        ...shopConfig,
        [field]: url,
      } as ShopConfig);
      success(`${field === 'logo' ? 'Logo' : '头图'}已更新`);
    }
  };

  return (
    <div className="shop-manage">
      <h2 className="page-title">店铺管理</h2>

      {/* 店铺头图 */}
      <section className="section">
        <h3 className="section-title">店铺形象</h3>
        <div className="image-upload-group">
          <div className="image-upload-item">
            <label className="image-label">店铺 Logo</label>
            <div className="image-preview">
              {shopConfig.logo ? (
                <img src={shopConfig.logo} alt="logo" className="preview-image" />
              ) : (
                <div className="image-placeholder">暂无 Logo</div>
              )}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => handleImageUpload('logo')}>
              更换 Logo
            </button>
          </div>
          <div className="image-upload-item">
            <label className="image-label">店铺头图</label>
            <div className="image-preview">
              {shopConfig.cover ? (
                <img src={shopConfig.cover} alt="cover" className="preview-image" />
              ) : (
                <div className="image-placeholder">暂无头图</div>
              )}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => handleImageUpload('cover')}>
              更换头图
            </button>
          </div>
        </div>
      </section>

      {/* 店铺基本信息 */}
      <section className="section">
        <h3 className="section-title">基本信息</h3>
        <div className="form-group">
          <label className="form-label">店铺名称</label>
          <input
            type="text"
            className="form-input"
            value={isEditing ? editForm.name : shopConfig.name}
            disabled={!isEditing}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="请输入店铺名称"
          />
        </div>
        <div className="form-group">
          <label className="form-label">店铺描述</label>
          <textarea
            className="form-textarea"
            value={isEditing ? editForm.description : shopConfig.description}
            disabled={!isEditing}
            rows={3}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            placeholder="请输入店铺描述"
          />
        </div>
        <div className="form-group">
          <label className="form-label">店铺公告</label>
          <textarea
            className="form-textarea"
            value={isEditing ? editForm.announcement : shopConfig.announcement}
            disabled={!isEditing}
            rows={2}
            onChange={(e) => setEditForm({ ...editForm, announcement: e.target.value })}
            placeholder="请输入店铺公告"
          />
        </div>
        <div className="form-group">
          <label className="form-label">温馨提示</label>
          <textarea
            className="form-textarea"
            value={isEditing ? editForm.notice : shopConfig.notice}
            disabled={!isEditing}
            rows={2}
            onChange={(e) => setEditForm({ ...editForm, notice: e.target.value })}
            placeholder="例如：高峰期可能延迟，请谅解"
          />
        </div>
        <div className="form-actions">
          {!isEditing ? (
            <button
              className="btn btn-primary"
              onClick={handleStartEdit}
            >
              编辑信息
            </button>
          ) : (
            <>
              <button
                className="btn btn-success"
                onClick={handleSaveEdit}
              >
                保存
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleCancelEdit}
              >
                取消
              </button>
            </>
          )}
        </div>
      </section>

      {/* 营业设置 */}
      <section className="section">
        <h3 className="section-title">营业设置</h3>
        <div className="setting-item">
          <div className="setting-label">自动接单</div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={shopStatus.autoAcceptOrders}
              onChange={() => {
                updateShopStatus({ autoAcceptOrders: !shopStatus.autoAcceptOrders });
              }}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-label">忙碌模式</div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={shopStatus.busyMode}
              onChange={toggleBusyMode}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-label">预计备餐时间</div>
          <select
            className="form-select"
            value={shopStatus.preparationMinutes}
            onChange={(e) => {
              updateShopStatus({ preparationMinutes: Number(e.target.value) });
            }}
          >
            <option value={10}>10 分钟</option>
            <option value={15}>15 分钟</option>
            <option value={20}>20 分钟</option>
            <option value={25}>25 分钟</option>
            <option value={30}>30 分钟</option>
          </select>
        </div>
      </section>

      {/* 营业时间 */}
      <section className="section">
        <h3 className="section-title">营业时间</h3>
        <div className="opening-hours-list">
          {shopConfig.openingHours.map((hour) => (
            <div key={hour.dayOfWeek} className="opening-hour-item">
              <span className="day-name">
                {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][hour.dayOfWeek]}
              </span>
              <span className="time-range">
                {hour.isOpen ? formatOpeningHour(hour.open, hour.close) : '休息'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 配送设置 */}
      <section className="section">
        <h3 className="section-title">配送设置</h3>
        <div className="form-group">
          <label className="form-label">起送价</label>
          <div className="input-with-unit">
            <input
              type="number"
              className="form-input"
              value={shopConfig.minOrderAmount}
              disabled={!isEditing}
              onChange={(e) => isEditing && setEditForm({ ...editForm, minOrderAmount: Number(e.target.value) })}
            />
            <span className="unit">元</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">配送费</label>
          <div className="input-with-unit">
            <input
              type="number"
              className="form-input"
              value={shopConfig.deliveryFee}
              disabled={!isEditing}
              onChange={(e) => isEditing && setEditForm({ ...editForm, deliveryFee: Number(e.target.value) })}
            />
            <span className="unit">元</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">打包费</label>
          <div className="input-with-unit">
            <input
              type="number"
              className="form-input"
              value={shopConfig.packageFee}
              disabled={!isEditing}
              onChange={(e) => isEditing && setEditForm({ ...editForm, packageFee: Number(e.target.value) })}
            />
            <span className="unit">元</span>
          </div>
        </div>
        <div className="form-hint">
          💡 提示：配送范围配置需要接入地图服务，当前版本暂不支持
        </div>
      </section>
    </div>
  );
};
