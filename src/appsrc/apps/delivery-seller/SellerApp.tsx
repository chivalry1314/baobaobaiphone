import React, { useState, useMemo, useEffect } from 'react';
import { useDeliverySellerStore } from './store/store';
import {
  SellerHome,
  ShopManage,
  ProductList,
  ProductForm,
  OrderList,
  OrderDetail,
  StatsView,
  MarketingManage,
  ReviewManage,
  MessageCenter,
  SettingsView,
} from './components';
import type { SellerTabKey, SellerScreen } from './uiTypes';
import { useDeliveryEventListeners } from './hooks/useDeliveryEventListeners';
import { initializeSync, startPeriodicSync, stopPeriodicSync, NotificationService } from '../../shared/business/delivery';

export interface SellerAppProps {
  onClose?: () => void;
}

export const SellerApp: React.FC<SellerAppProps> = ({ onClose }) => {
  const {
    route,
    setRoute,
    switchTab,
    openScreen,
    shopConfig,
    isHydrated,
    badReviewCount,
    unreadNotificationCount,
  } = useDeliverySellerStore();

  const [activeTab, setActiveTab] = useState<SellerTabKey>(route.tab);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showNewProductForm, setShowNewProductForm] = useState(false);

  // 启用事件监听
  useDeliveryEventListeners();

  // 初始化同步和定时同步
  useEffect(() => {
    const merchantId = shopConfig?.merchantId;

    // 初始化同步
    initializeSync(merchantId).catch(console.error);

    // 启动定时同步
    startPeriodicSync(merchantId);

    // 请求通知权限
    NotificationService.requestPermission().catch(console.error);

    // 清理函数
    return () => {
      stopPeriodicSync();
    };
  }, [shopConfig?.merchantId]);

  // 监听通知事件并显示 Toast
  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      console.log('[SellerApp] Notification received:', event.detail);
      // 这里可以通过 store 显示 Toast，或者使用全局通知组件
    };

    window.addEventListener('delivery-notification', handleNotification as EventListener);

    return () => {
      window.removeEventListener('delivery-notification', handleNotification as EventListener);
    };
  }, []);

  // 同步 store 中的 route 变化
  React.useEffect(() => {
    if (route.tab !== activeTab) {
      setActiveTab(route.tab);
    }
  }, [route.tab]);

  // 渲染当前屏幕内容
  const renderScreen = () => {
    switch (route.screen) {
      case 'home':
        return (
          <SellerHome
            onNavigate={(screen, params) => {
              openScreen(screen as SellerScreen, params);
            }}
          />
        );

      case 'shop-manage':
        return <ShopManage />;

      case 'order-list':
        return (
          <OrderList
            onViewDetail={(orderId) => {
              setViewingOrderId(orderId);
            }}
            initialFilter={route.params?.filter as string}
          />
        );

      case 'order-detail':
        return (
          <OrderDetail
            orderId={viewingOrderId || (route.params?.orderId as string)}
            onBack={() => {
              setViewingOrderId(null);
              openScreen('order-list');
            }}
          />
        );

      case 'product-list':
        return (
          <ProductList
            onEdit={(productId) => {
              setEditingProductId(productId);
            }}
            onAdd={() => setShowNewProductForm(true)}
          />
        );

      case 'product-form':
        return (
          <ProductForm
            productId={editingProductId || undefined}
            onSave={() => {
              setEditingProductId(null);
              setShowNewProductForm(false);
              openScreen('product-list');
            }}
            onCancel={() => {
              setEditingProductId(null);
              setShowNewProductForm(false);
              openScreen('product-list');
            }}
          />
        );

      case 'stats-view':
        return <StatsView onBack={() => openScreen('home')} />;

      case 'marketing-manage':
        return <MarketingManage onBack={() => openScreen('home')} />;

      case 'review-manage':
        return <ReviewManage onBack={() => openScreen('me')} />;

      case 'message-center':
        return <MessageCenter onBack={() => openScreen('me')} />;

      case 'settings-view':
        return <SettingsView onBack={() => openScreen('me')} />;

      case 'me':
        return (
          <div className="me-page">
            <h2 className="page-title">我的</h2>
            <div className="profile-section">
              <div className="profile-avatar">👤</div>
              <div className="profile-info">
                <h3>{shopConfig?.name || '店铺名称'}</h3>
                <p>外卖商家端 v1.0.0</p>
              </div>
            </div>
            <div className="menu-list">
              <button className="menu-item" onClick={() => openScreen('shop-manage')}>
                <span className="menu-icon">🏪</span>
                <span>店铺管理</span>
              </button>
              <button className="menu-item" onClick={() => openScreen('stats-view')}>
                <span className="menu-icon">📊</span>
                <span>数据统计</span>
              </button>
              <button className="menu-item" onClick={() => openScreen('marketing-manage')}>
                <span className="menu-icon">🎉</span>
                <span>营销活动</span>
              </button>
              <button className="menu-item" onClick={() => openScreen('review-manage')}>
                <span className="menu-icon">💬</span>
                <span>评价管理</span>
                {badReviewCount > 0 && (
                  <span className="menu-badge">{badReviewCount}</span>
                )}
              </button>
              <button className="menu-item" onClick={() => openScreen('message-center')}>
                <span className="menu-icon">📬</span>
                <span>消息中心</span>
                {unreadNotificationCount > 0 && (
                  <span className="menu-badge">{unreadNotificationCount}</span>
                )}
              </button>
              <button className="menu-item" onClick={() => openScreen('settings-view')}>
                <span className="menu-icon">⚙️</span>
                <span>设置</span>
              </button>
            </div>
          </div>
        );

      default:
        return <div>页面不存在</div>;
    }
  };

  // 处理 Tab 切换
  const handleTabChange = (tab: SellerTabKey) => {
    setActiveTab(tab);
    switchTab(tab);
  };

  // 加载状态
  if (!isHydrated) {
    return (
      <div className="seller-app loading">
        <div className="loading-spinner">加载中...</div>
      </div>
    );
  }

  return (
    <div className="seller-app">
      {/* 顶部导航栏 */}
      <header className="app-header">
        <h1 className="app-title">{shopConfig?.name || '外卖商家'}</h1>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </header>

      {/* 主内容区 */}
      <main className="app-main">
        {renderScreen()}
      </main>

      {/* 底部导航栏 */}
      <nav className="tab-bar">
        <button
          className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => handleTabChange('home')}
        >
          <span className="tab-icon">🏠</span>
          <span className="tab-label">首页</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => handleTabChange('orders')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-label">订单</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => handleTabChange('products')}
        >
          <span className="tab-icon">📦</span>
          <span className="tab-label">商品</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'me' ? 'active' : ''}`}
          onClick={() => handleTabChange('me')}
        >
          <span className="tab-icon">👤</span>
          <span className="tab-label">我的</span>
        </button>
      </nav>

      {/* 新建商品表单弹窗 */}
      {showNewProductForm && (
        <div className="modal-overlay" onClick={() => setShowNewProductForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <ProductForm
              onSave={() => {
                setShowNewProductForm(false);
                openScreen('product-list');
              }}
              onCancel={() => setShowNewProductForm(false)}
            />
          </div>
        </div>
      )}

      {/* 编辑商品表单弹窗 */}
      {editingProductId && !showNewProductForm && (
        <div className="modal-overlay" onClick={() => setEditingProductId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <ProductForm
              productId={editingProductId}
              onSave={() => {
                setEditingProductId(null);
                openScreen('product-list');
              }}
              onCancel={() => setEditingProductId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
