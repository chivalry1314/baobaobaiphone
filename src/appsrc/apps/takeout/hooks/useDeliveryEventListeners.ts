import { useEffect } from 'react';
import { DeliveryEventBus, ORDER_EVENTS, SHOP_EVENTS, PRODUCT_EVENTS } from '../../../shared/business/delivery';
import { useTakeoutStore } from '../store';
import type { DeliveryOrder } from '../types';

/**
 * 用户端事件监听 Hook
 * 监听来自商家端的事件，实现实时更新
 */
export function useTakeoutDeliveryEventListeners() {
  const { orders, updateOrder } = useTakeoutStore();

  // 监听订单状态变更事件
  useEffect(() => {
    const handleOrderStatusChanged = (data: { orderId: string; status: string; order?: DeliveryOrder }) => {
      console.log('[TakeoutEventListeners] Order status changed:', data);
      
      if (data.order) {
        // 更新订单
        updateOrder(data.order);
      }
    };

    DeliveryEventBus.on(ORDER_EVENTS.STATUS_CHANGED, handleOrderStatusChanged);

    return () => {
      DeliveryEventBus.off(ORDER_EVENTS.STATUS_CHANGED, handleOrderStatusChanged);
    };
  }, [updateOrder]);

  // 监听订单取消事件
  useEffect(() => {
    const handleOrderCancelled = (data: { orderId: string; status: string; order?: DeliveryOrder }) => {
      console.log('[TakeoutEventListeners] Order cancelled:', data);
      
      if (data.order) {
        updateOrder(data.order);
      }
    };

    DeliveryEventBus.on(ORDER_EVENTS.CANCELLED, handleOrderCancelled);

    return () => {
      DeliveryEventBus.off(ORDER_EVENTS.CANCELLED, handleOrderCancelled);
    };
  }, [updateOrder]);

  // 监听店铺状态变更事件
  useEffect(() => {
    const handleShopStatusChanged = (status: { isOpen: boolean; busyMode?: boolean; merchantId?: string }) => {
      console.log('[TakeoutEventListeners] Shop status changed:', status);
      
      // 更新商家列表中的营业状态
      // 注意：这里需要知道是哪个商家，实际实现中 data 应该包含 merchantId
    };

    DeliveryEventBus.on(SHOP_EVENTS.STATUS_CHANGED, handleShopStatusChanged);

    return () => {
      DeliveryEventBus.off(SHOP_EVENTS.STATUS_CHANGED, handleShopStatusChanged);
    };
  }, []);

  // 监听商品库存变更事件
  useEffect(() => {
    const handleProductStockChanged = (data: { productId: string; stock: number }) => {
      console.log('[TakeoutEventListeners] Product stock changed:', data);
      
      // 更新商品库存
      // 可以通过 dishId 找到对应的商品并更新
    };

    DeliveryEventBus.on(PRODUCT_EVENTS.STOCK_CHANGED, handleProductStockChanged);

    return () => {
      DeliveryEventBus.off(PRODUCT_EVENTS.STOCK_CHANGED, handleProductStockChanged);
    };
  }, []);
}
