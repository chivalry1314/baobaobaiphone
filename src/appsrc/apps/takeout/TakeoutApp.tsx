import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Home, ListOrdered, User } from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import {
  TakeoutCart,
  TakeoutHome,
  TakeoutMe,
  TakeoutMerchantDetail,
  TakeoutMerchantList,
  TakeoutOrderDetail,
  TakeoutOrders,
  TakeoutAddressForm,
  ToastProvider,
  useToast,
  type TakeoutCartFeeSummary,
  type TakeoutCartMerchantGroup,
} from './components';
import { useTakeoutStore } from './store';
import type { TakeoutAppProps } from './types';
import type { TakeoutBizFilter, TakeoutScreen, TakeoutTabKey } from './uiTypes';
import {
  computeCartCount,
  formatDate,
  formatDateTime,
  formatMoney,
  groupCartByMerchant,
  resolveBestCouponDiscount,
  debounce,
} from './utils';

const screenTitleMap: Record<TakeoutScreen, string> = {
  home: '外卖',
  'merchant-list': '商家列表',
  'merchant-detail': '店铺详情',
  cart: '购物车',
  checkout: '确认订单',
  orders: '订单',
  'order-detail': '订单详情',
  me: '我的',
  addresses: '地址管理',
  coupons: '优惠券',
};

const rootScreenSet = new Set<TakeoutScreen>(['home', 'orders', 'me']);

const tabItems: Array<{ id: TakeoutTabKey; label: string; icon: React.ReactNode }> = [
  { id: 'home', label: '首页', icon: <Home size={18} /> },
  { id: 'orders', label: '订单', icon: <ListOrdered size={18} /> },
  { id: 'me', label: '我的', icon: <User size={18} /> },
];

const buildFeeSummary = (
  groups: TakeoutCartMerchantGroup[],
  discount: number
): TakeoutCartFeeSummary => {
  const itemTotal = Number(groups.reduce((sum, group) => sum + group.itemTotal, 0).toFixed(2));
  const packageFee = Number(groups.reduce((sum, group) => sum + group.packageFee, 0).toFixed(2));
  const deliveryFee = Number(groups.reduce((sum, group) => sum + group.deliveryFee, 0).toFixed(2));
  const payableAmount = Number((itemTotal + packageFee + deliveryFee - discount).toFixed(2));

  return {
    itemTotal,
    packageFee,
    deliveryFee,
    discountFee: discount,
    payableAmount,
  };
};

const merchantMatchesKeyword = (
  merchantName: string,
  merchantTags: string[],
  keyword: string
): boolean => {
  if (!keyword) return true;
  const byName = merchantName.toLowerCase().includes(keyword);
  if (byName) return true;
  return merchantTags.some((tag) => tag.toLowerCase().includes(keyword));
};

// 内部组件，使用 toast
const TakeoutAppInner: React.FC<TakeoutAppProps> = ({ onClose }) => {
  const toast = useToast();
  const {
    route,
    merchants,
    categories,
    dishes,
    cartLines,
    orders,
    addresses,
    coupons,
    profile,
    searchKeyword,
    bizFilter,
    sortKey,
    merchantFilters,
    homeRecommendationVisibleCount,
    selectedAddressId,
    activeMerchantId,
    deliveryTimeMode,
    scheduleDate,
    scheduleTime,
    selectedCouponId,
    isHydrated,
    loading,
    error,
    hydrateFromSeed,
    enterMerchant,
    enterMerchantList,
    setSearchKeyword,
    setBizFilter,
    setSortKey,
    setMerchantFilters,
    resetMerchantFilters,
    loadMoreRecommendations,
    addDishToCart,
    increaseCartLine,
    decreaseCartLine,
    removeCartLine,
    clearMerchantCart,
    submitCartAsOrder,
    deleteOrder,
    reorderOrderToCart,
    urgeOrder,
    requestAfterSale,
    rateOrder,
    setDeliveryTimeMode,
    setScheduleDate,
    setScheduleTime,
    setSelectedCoupon,
    setDefaultAddress,
    setSelectedAddress,
    addAddress,
    updateAddress,
    removeAddress,
    openScreen,
    switchTab,
    resetError,
    setLoading,
    setError,
  } = useTakeoutStore();

  // 地址表单状态
  const [showAddressForm, setShowAddressForm] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<{ id: string } | null>(null);

  React.useEffect(() => {
    if (!isHydrated) {
      hydrateFromSeed();
    }
  }, [hydrateFromSeed, isHydrated]);

  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  const merchantIdsMatchedByDishKeyword = React.useMemo(() => {
    if (!normalizedKeyword) return new Set<string>();

    const matched = dishes
      .filter((dish) => {
        return (
          dish.name.toLowerCase().includes(normalizedKeyword) ||
          dish.desc.toLowerCase().includes(normalizedKeyword)
        );
      })
      .map((dish) => dish.merchantId);

    return new Set(matched);
  }, [dishes, normalizedKeyword]);

  const filteredMerchants = React.useMemo(() => {
    return merchants.filter((merchant) => {
      if (!merchant.visible || !merchant.isOpen) return false;
      if (bizFilter !== 'all' && merchant.bizType !== bizFilter) return false;

      if (merchantFilters.maxDeliveryMinutes != null && merchant.avgDeliveryMinutes > merchantFilters.maxDeliveryMinutes) {
        return false;
      }

      if (merchantFilters.maxMinOrderAmount != null && merchant.minOrderAmount > merchantFilters.maxMinOrderAmount) {
        return false;
      }

      if (merchantFilters.minRating != null && merchant.rating < merchantFilters.minRating) {
        return false;
      }

      if (merchantFilters.promotionOnly && merchant.promotions.length === 0) {
        return false;
      }

      if (!normalizedKeyword) return true;
      if (merchantIdsMatchedByDishKeyword.has(merchant.id)) return true;

      return merchantMatchesKeyword(merchant.name, merchant.tags, normalizedKeyword);
    });
  }, [bizFilter, merchantFilters, merchantIdsMatchedByDishKeyword, merchants, normalizedKeyword]);

  const recommendedMerchants = React.useMemo(
    () => filteredMerchants.slice(0, homeRecommendationVisibleCount),
    [filteredMerchants, homeRecommendationVisibleCount]
  );

  const hasMoreRecommendations = recommendedMerchants.length < filteredMerchants.length;

  const routeMerchantId =
    route.params && typeof route.params.merchantId === 'string' ? route.params.merchantId : null;

  const currentMerchant = React.useMemo(() => {
    const targetId = routeMerchantId || activeMerchantId;
    if (!targetId) return null;
    return merchants.find((merchant) => merchant.id === targetId) || null;
  }, [activeMerchantId, merchants, routeMerchantId]);

  const currentMerchantCategories = React.useMemo(() => {
    if (!currentMerchant) return [];
    return categories
      .filter((category) => category.merchantId === currentMerchant.id)
      .sort((left, right) => left.sort - right.sort);
  }, [categories, currentMerchant]);

  const currentMerchantDishes = React.useMemo(() => {
    if (!currentMerchant) return [];
    return dishes
      .filter((dish) => dish.merchantId === currentMerchant.id && dish.status === 'on' && dish.stock > 0)
      .sort((left, right) => right.monthlySales - left.monthlySales);
  }, [currentMerchant, dishes]);

  const merchantCartLines = React.useMemo(() => {
    if (!currentMerchant) return [];
    return cartLines.filter((line) => line.merchantId === currentMerchant.id);
  }, [cartLines, currentMerchant]);

  const merchantCartCount = React.useMemo(() => computeCartCount(merchantCartLines), [merchantCartLines]);

  const merchantCartAmount = React.useMemo(
    () => Number(merchantCartLines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0).toFixed(2)),
    [merchantCartLines]
  );

  const cartCount = React.useMemo(() => computeCartCount(cartLines), [cartLines]);

  const selectedAddress = React.useMemo(() => {
    const selected = selectedAddressId
      ? addresses.find((address) => address.id === selectedAddressId)
      : undefined;
    if (selected) return selected;

    const fallback = addresses.find((address) => address.isDefault);
    return fallback || addresses[0] || null;
  }, [addresses, selectedAddressId]);

  const cartGroups = React.useMemo(
    () => groupCartByMerchant(cartLines, merchants),
    [cartLines, merchants]
  );

  const cartSubtotal = React.useMemo(() => {
    return Number(
      cartGroups
        .reduce((sum, group) => sum + group.itemTotal + group.packageFee + group.deliveryFee, 0)
        .toFixed(2)
    );
  }, [cartGroups]);

  const couponDiscount = React.useMemo(() => {
    const matched = resolveBestCouponDiscount(cartSubtotal, coupons, selectedCouponId);
    return matched.discount;
  }, [cartSubtotal, coupons, selectedCouponId]);

  const feeSummary = React.useMemo(
    () => buildFeeSummary(cartGroups, couponDiscount),
    [cartGroups, couponDiscount]
  );

  const currentOrder = React.useMemo(() => {
    if (!route.params || typeof route.params.orderId !== 'string') return null;
    return orders.find((order) => order.id === route.params?.orderId) || null;
  }, [orders, route.params]);

  const shouldShowTabBar = rootScreenSet.has(route.screen);

  const handleBack = React.useCallback(() => {
    if (route.screen === 'home' || route.screen === 'orders' || route.screen === 'me') {
      onClose();
      return;
    }

    if (route.screen === 'merchant-detail') {
      openScreen('merchant-list', undefined, 'home');
      return;
    }

    if (route.screen === 'merchant-list' || route.screen === 'cart' || route.screen === 'checkout') {
      switchTab('home');
      return;
    }

    if (route.screen === 'order-detail') {
      switchTab('orders');
      return;
    }

    switchTab('me');
  }, [onClose, openScreen, route.screen, switchTab]);

  const handleSubmitOrder = React.useCallback(() => {
    if (addresses.length === 0) {
      toast.showToast('请先添加配送地址', 'error');
      openScreen('addresses', undefined, 'me');
      return;
    }

    const nextOrderId = submitCartAsOrder();
    if (!nextOrderId) {
      toast.showToast('下单失败，请重试', 'error');
      return;
    }

    toast.showToast('订单提交成功！', 'success');
    openScreen('order-detail', { orderId: nextOrderId }, 'orders');
  }, [addresses.length, openScreen, submitCartAsOrder, toast]);

  const handleRateOrder = React.useCallback(
    (orderId: string) => {
      const raw = window.prompt('请输入评分（1-5）', '5');
      if (!raw) return;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      const score = Math.max(1, Math.min(5, Math.round(parsed)));
      rateOrder(orderId, score);
      toast.showToast('感谢你的评价！', 'success');
    },
    [rateOrder, toast]
  );

  const handleQuickCategory = React.useCallback(
    (filter: TakeoutBizFilter) => {
      setBizFilter(filter);
      enterMerchantList();
    },
    [enterMerchantList, setBizFilter]
  );

  const handleSearchSubmit = React.useCallback(() => {
    enterMerchantList();
  }, [enterMerchantList]);

  // 防抖搜索
  const debouncedSearchChange = React.useMemo(
    () => debounce((keyword: string) => setSearchKeyword(keyword), 300),
    [setSearchKeyword]
  );

  const handleSearchChange = React.useCallback(
    (keyword: string) => {
      debouncedSearchChange(keyword);
    },
    [debouncedSearchChange]
  );

  // 地址管理
  const handleOpenAddAddress = React.useCallback(() => {
    setEditingAddress(null);
    setShowAddressForm(true);
  }, []);

  const handleOpenEditAddress = React.useCallback((address: { id: string }) => {
    setEditingAddress(address);
    setShowAddressForm(true);
  }, []);

  const handleDeleteAddress = React.useCallback(
    (address: { id: string }) => {
      if (window.confirm('确定要删除这个地址吗？')) {
        removeAddress(address.id);
        toast.showToast('地址已删除', 'success');
      }
    },
    [removeAddress, toast]
  );

  const handleAddressFormSubmit = React.useCallback(
    (data: { name: string; phone: string; detail: string; isDefault: boolean }) => {
      setLoading(true);

      // 模拟异步操作
      setTimeout(() => {
        if (editingAddress) {
          updateAddress(editingAddress.id, data);
          toast.showToast('地址已更新', 'success');
        } else {
          addAddress(data);
          toast.showToast('地址已添加', 'success');
        }
        setLoading(false);
        setShowAddressForm(false);
        setEditingAddress(null);
      }, 500);
    },
    [addAddress, editingAddress, setLoading, toast, updateAddress]
  );

  const handleAddressFormCancel = React.useCallback(() => {
    setShowAddressForm(false);
    setEditingAddress(null);
  }, []);

  // 催单
  const handleUrgeOrder = React.useCallback(
    (orderId: string) => {
      urgeOrder(orderId);
      toast.showToast('已催单，商家会尽快处理', 'info');
    },
    [toast, urgeOrder]
  );

  // 售后
  const handleAfterSale = React.useCallback(
    (orderId: string) => {
      requestAfterSale(orderId);
      toast.showToast('售后申请已提交', 'success');
    },
    [requestAfterSale, toast]
  );

  // 再来一单
  const handleReorder = React.useCallback(
    (orderId: string) => {
      reorderOrderToCart(orderId);
      toast.showToast('商品已加入购物车', 'success');
      switchTab('home');
    },
    [reorderOrderToCart, switchTab, toast]
  );

  // 删除订单
  const handleDeleteOrder = React.useCallback(
    (orderId: string) => {
      if (window.confirm('确定要删除这个订单吗？')) {
        deleteOrder(orderId);
        toast.showToast('订单已删除', 'success');
      }
    },
    [deleteOrder, toast]
  );

  const renderContent = () => {
    if (route.screen === 'home') {
      return (
        <TakeoutHome
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          searchKeyword={searchKeyword}
          cartCount={cartCount}
          recommendedMerchants={recommendedMerchants}
          hasMoreRecommendations={hasMoreRecommendations}
          isLoading={loading}
          onSelectAddress={(addressId) => setSelectedAddress(addressId)}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onQuickCategory={handleQuickCategory}
          onOpenMerchant={enterMerchant}
          onOpenCart={() => openScreen('cart', undefined, 'home')}
          onLoadMoreRecommendations={loadMoreRecommendations}
        />
      );
    }

    if (route.screen === 'merchant-list') {
      return (
        <TakeoutMerchantList
          merchants={filteredMerchants}
          searchKeyword={searchKeyword}
          bizFilter={bizFilter}
          sortKey={sortKey}
          merchantFilters={merchantFilters}
          onSearchChange={handleSearchChange}
          onBizFilterChange={setBizFilter}
          onSortChange={setSortKey}
          onUpdateFilters={setMerchantFilters}
          onResetFilters={resetMerchantFilters}
          onOpenMerchant={enterMerchant}
        />
      );
    }

    if (route.screen === 'merchant-detail') {
      if (!currentMerchant) {
        return (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-500">
            店铺不存在或已下线。
          </div>
        );
      }

      return (
        <TakeoutMerchantDetail
          merchant={currentMerchant}
          categories={currentMerchantCategories}
          dishes={currentMerchantDishes}
          merchantCartCount={merchantCartCount}
          merchantCartAmount={merchantCartAmount}
          onAddDish={(dishId, options) => {
            addDishToCart(dishId, options);
            toast.showToast('已加入购物车', 'success', 1500);
          }}
          onOpenCart={() => openScreen('cart', undefined, 'home')}
        />
      );
    }

    if (route.screen === 'cart' || route.screen === 'checkout') {
      return (
        <TakeoutCart
          groups={cartGroups}
          addresses={addresses}
          selectedAddressId={selectedAddress?.id || null}
          deliveryTimeMode={deliveryTimeMode}
          scheduleDate={scheduleDate}
          scheduleTime={scheduleTime}
          coupons={coupons}
          selectedCouponId={selectedCouponId}
          feeSummary={feeSummary}
          isLoading={loading}
          onIncrease={increaseCartLine}
          onDecrease={decreaseCartLine}
          onRemove={removeCartLine}
          onClearMerchant={clearMerchantCart}
          onSelectAddress={setSelectedAddress}
          onChangeDeliveryMode={setDeliveryTimeMode}
          onChangeScheduleDate={setScheduleDate}
          onChangeScheduleTime={setScheduleTime}
          onSelectCoupon={setSelectedCoupon}
          onPlaceOrder={handleSubmitOrder}
          onGoShopping={() => switchTab('home')}
        />
      );
    }

    if (route.screen === 'orders') {
      return (
        <TakeoutOrders
          orders={orders}
          isLoading={loading}
          onOpenOrderDetail={(orderId) => openScreen('order-detail', { orderId }, 'orders')}
          onReorder={handleReorder}
          onUrge={handleUrgeOrder}
          onAfterSale={handleAfterSale}
          onRate={handleRateOrder}
          onDeleteOrder={handleDeleteOrder}
          onGoShopping={() => switchTab('home')}
        />
      );
    }

    if (route.screen === 'order-detail') {
      if (!currentOrder) {
        return (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-500">
            未找到订单详情。
          </div>
        );
      }

      return (
        <TakeoutOrderDetail
          order={currentOrder}
          onReorder={handleReorder}
          onUrge={handleUrgeOrder}
          onAfterSale={handleAfterSale}
          onRate={handleRateOrder}
        />
      );
    }

    if (route.screen === 'me') {
      return (
        <TakeoutMe
          profile={profile}
          addresses={addresses}
          coupons={coupons}
          onOpenAddresses={() => openScreen('addresses', undefined, 'me')}
          onOpenCoupons={() => openScreen('coupons', undefined, 'me')}
          onAddAddress={handleOpenAddAddress}
          onEditAddress={handleOpenEditAddress}
          onDeleteAddress={handleDeleteAddress}
          onContactSupport={() => toast.showToast('客服功能开发中', 'info')}
          onOpenSettings={() => toast.showToast('设置功能开发中', 'info')}
          onOpenInvoice={() => toast.showToast('发票功能开发中', 'info')}
          onOpenPrivacy={() => toast.showToast('隐私政策开发中', 'info')}
        />
      );
    }

    if (route.screen === 'addresses') {
      return (
        <section className="space-y-3 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">我的地址</h3>
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white"
              onClick={handleOpenAddAddress}
            >
              新增地址
            </button>
          </div>
          {addresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-500">
              暂无地址，点击右上角添加
            </div>
          ) : (
            addresses.map((address) => (
              <article key={address.id} className="rounded-2xl bg-white/90 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {address.name} · {address.phone}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{address.detail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {address.isDefault ? (
                      <span className="rounded-lg bg-orange-100 px-2 py-1 text-xs text-orange-600">默认</span>
                    ) : (
                      <button
                        type="button"
                        className="text-xs font-medium text-gray-600 hover:text-gray-800"
                        onClick={() => {
                          setDefaultAddress(address.id);
                          setSelectedAddress(address.id);
                          toast.showToast('已设为默认地址', 'success');
                        }}
                      >
                        设为默认
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        onClick={() => handleOpenEditAddress(address)}
                      >
                        编辑
                      </button>
                      {!address.isDefault && (
                        <button
                          type="button"
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteAddress(address)}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      );
    }

    if (route.screen === 'coupons') {
      return (
        <section className="space-y-3 pb-2">
          <h3 className="text-sm font-semibold text-gray-800">我的优惠券</h3>
          {coupons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-500">
              暂无优惠券
            </div>
          ) : (
            coupons.map((coupon) => (
              <article key={coupon.id} className="rounded-2xl bg-white/90 p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-800">{coupon.title}</p>
                <p className="mt-1 text-xs text-gray-500">
                  满 {coupon.thresholdAmount} 元减 {coupon.discountAmount} 元
                </p>
                <p className="mt-1 text-xs text-gray-500">到期时间：{formatDateTime(coupon.expiresAt)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  状态：{coupon.used ? '已使用' : formatDate(coupon.expiresAt) < formatDate(Date.now()) ? '已过期' : '可用'}
                </p>
              </article>
            ))
          )}
        </section>
      );
    }

    return null;
  };

  return (
    <>
      <motion.div
        {...APP_OPEN_MOTION}
        exit={APP_CLOSE_MOTION}
        transition={{ type: 'spring', damping: 22, stiffness: 230 }}
        className="absolute inset-0 z-50 flex flex-col bg-gradient-to-b from-orange-50 via-amber-50 to-white text-gray-900"
      >
        <header className="flex items-center gap-2 px-2 pb-3 pt-12">
          <button
            type="button"
            className="rounded-lg p-2 text-gray-700 active:scale-95"
            onClick={handleBack}
            aria-label="返回"
          >
            <ChevronLeft size={26} />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold text-gray-800">
            {screenTitleMap[route.screen]}
          </h1>
          <div className="w-10" />
        </header>

        {error ? (
          <div className="mx-4 mb-2 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
            <span>{error}</span>
            <button type="button" className="font-medium" onClick={resetError}>
              关闭
            </button>
          </div>
        ) : null}

        <main className="flex-1 overflow-y-auto px-4 pb-4">{renderContent()}</main>

        {shouldShowTabBar ? (
          <nav className="grid grid-cols-3 border-t border-white/80 bg-white/90 px-2 py-2">
            {tabItems.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.95 }}
                type="button"
                className={`flex flex-col items-center justify-center gap-1 rounded-lg py-1 text-xs ${
                  route.tab === item.id ? 'text-orange-600' : 'text-gray-500'
                }`}
                onClick={() => switchTab(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </motion.button>
            ))}
          </nav>
        ) : null}
      </motion.div>

      {/* 地址表单弹窗 */}
      <AnimatePresence>
        {showAddressForm && (
          <TakeoutAddressForm
            initialData={editingAddress ? addresses.find((a) => a.id === editingAddress.id) || null : null}
            onSubmit={handleAddressFormSubmit}
            onCancel={handleAddressFormCancel}
            isLoading={loading}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// 导出带 ToastProvider 的组件
export const TakeoutApp: React.FC<TakeoutAppProps> = (props) => {
  return (
    <ToastProvider>
      <TakeoutAppInner {...props} />
    </ToastProvider>
  );
};
