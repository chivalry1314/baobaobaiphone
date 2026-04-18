import React, { useState } from 'react';
import { useDeliverySellerStore } from '../store/store';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';
import type { SystemNotification, NotificationType } from '../types';

export interface MessageCenterProps {
  onBack?: () => void;
}

export const MessageCenter: React.FC<MessageCenterProps> = ({ onBack }) => {
  const { 
    notifications, 
    notificationSettings, 
    addNotification,
    markNotificationRead, 
    markAllNotificationsRead,
    setNotificationSettings,
    loadNotifications,
  } = useDeliverySellerStore();
  
  const [activeTab, setActiveTab] = useState<'messages' | 'settings'>('messages');
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');

  React.useEffect(() => {
    loadNotifications();
  }, []);

  const getFilteredNotifications = (): SystemNotification[] => {
    if (filterType === 'all') {
      return notifications;
    }
    return notifications.filter((n) => n.type === filterType);
  };

  const getTypeIcon = (type: NotificationType): string => {
    const icons: Record<NotificationType, string> = {
      'system': '📢',
      'order': '📋',
      'review': '⭐',
      'marketing': '🎉',
    };
    return icons[type] || '📬';
  };

  const getTypeLabel = (type: NotificationType): string => {
    const labels: Record<NotificationType, string> = {
      'system': '系统通知',
      'order': '订单通知',
      'review': '评价通知',
      'marketing': '活动通知',
    };
    return labels[type] || type;
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="message-center">
      <div className="detail-header">
        <button className="btn-icon back-btn" onClick={onBack}>
          ←
        </button>
        <h2 className="page-title">消息中心</h2>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="message-tabs">
        <button
          className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          消息列表
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          通知设置
        </button>
      </div>

      {activeTab === 'messages' ? (
        <>
          {/* 全部已读按钮 */}
          {unreadCount > 0 && (
            <div className="mark-all-read">
              <button
                className="btn btn-sm btn-secondary"
                onClick={markAllNotificationsRead}
              >
                全部已读
              </button>
            </div>
          )}

          {/* 类型筛选 */}
          <div className="notification-filter">
            <button
              className={`filter-chip ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              全部
            </button>
            {(['system', 'order', 'review', 'marketing'] as NotificationType[]).map((type) => (
              <button
                key={type}
                className={`filter-chip ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(type)}
              >
                {getTypeLabel(type)}
              </button>
            ))}
          </div>

          {/* 通知列表 */}
          <div className="notification-list">
            {filteredNotifications.length === 0 ? (
              <div className="empty-state">
                <p>暂无消息</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <div className="notification-icon">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4 className="notification-title">{notification.title}</h4>
                      <span className="notification-time">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="notification-body">{notification.content}</p>
                    {!notification.isRead && (
                      <span className="unread-dot" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* 通知设置 */
        <div className="notification-settings">
          <section className="settings-section">
            <h3 className="settings-title">通知类型</h3>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">订单通知</span>
                <span className="setting-desc">新订单、订单状态变更提醒</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.orderNotification}
                  onChange={(e) => setNotificationSettings({ orderNotification: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">评价通知</span>
                <span className="setting-desc">用户评价提醒</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.reviewNotification}
                  onChange={(e) => setNotificationSettings({ reviewNotification: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">活动通知</span>
                <span className="setting-desc">平台活动、营销推广提醒</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.marketingNotification}
                  onChange={(e) => setNotificationSettings({ marketingNotification: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-title">提醒方式</h3>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">声音提醒</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.soundEnabled}
                  onChange={(e) => setNotificationSettings({ soundEnabled: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">震动提醒</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.vibrateEnabled}
                  onChange={(e) => setNotificationSettings({ vibrateEnabled: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
