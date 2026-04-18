import { useEffect } from 'react';
import { DeliveryEventBus, ORDER_EVENTS, SHOP_EVENTS, PRODUCT_EVENTS, REVIEW_EVENTS } from '../../../shared/business/delivery';
import { useDeliverySellerStore } from '../store/store';
import type { DeliveryOrder, ShopStatus } from '../../../shared/business/delivery';

/**
 * 商家端事件监听 Hook
 * 监听来自用户端和其他模块的事件
 */
export function useDeliveryEventListeners() {
  const {
    orders,
    setOrders,
    shopStatus,
    updateShopStatus,
    products,
    updateProductStock,
    newOrderCount,
    setNewOrderCount,
  } = useDeliverySellerStore();

  // 监听新订单事件
  useEffect(() => {
    const handleNewOrder = (order: DeliveryOrder) => {
      console.log('[DeliveryEventListeners] New order received:', order.id);
      
      // 检查订单是否已存在
      const exists = orders.some((o) => o.id === order.id);
      if (!exists) {
        // 添加到订单列表（通过 store 的 addOrder 方法）
        // 注意：这里需要根据实际 store 实现调整
        setNewOrderCount(newOrderCount + 1);
      }
    };

    DeliveryEventBus.on(ORDER_EVENTS.NEW_ORDER, handleNewOrder);

    return () => {
      DeliveryEventBus.off(ORDER_EVENTS.NEW_ORDER, handleNewOrder);
    };
  }, [orders, newOrderCount, setNewOrderCount]);

  // 监听订单状态变更事件
  useEffect(() => {
    const handleOrderStatusChanged = (data: { orderId: string; status: string; order?: DeliveryOrder }) => {
      console.log('[DeliveryEventListeners] Order status changed:', data);
      
      // 更新订单状态
      if (data.order) {
        // 通过 store 更新订单
      }
    };

    DeliveryEventBus.on(ORDER_EVENTS.STATUS_CHANGED, handleOrderStatusChanged);

    return () => {
      DeliveryEventBus.off(ORDER_EVENTS.STATUS_CHANGED, handleOrderStatusChanged);
    };
  }, []);

  // 监听店铺状态变更事件（用于多设备同步）
  useEffect(() => {
    const handleShopStatusChanged = (status: ShopStatus) => {
      console.log('[DeliveryEventListeners] Shop status changed:', status);
      
      // 避免循环更新
      if (
        status.isOpen !== shopStatus.isOpen ||
        status.busyMode !== shopStatus.busyMode ||
        status.preparationMinutes !== shopStatus.preparationMinutes
      ) {
        updateShopStatus(status);
      }
    };

    DeliveryEventBus.on(SHOP_EVENTS.STATUS_CHANGED, handleShopStatusChanged);

    return () => {
      DeliveryEventBus.off(SHOP_EVENTS.STATUS_CHANGED, handleShopStatusChanged);
    };
  }, [shopStatus, updateShopStatus]);

  // 监听商品库存变更事件
  useEffect(() => {
    const handleProductStockChanged = (data: { productId: string; stock: number }) => {
      console.log('[DeliveryEventListeners] Product stock changed:', data);
      
      // 更新商品库存
      updateProductStock(data.productId, data.stock);
    };

    DeliveryEventBus.on(PRODUCT_EVENTS.STOCK_CHANGED, handleProductStockChanged);

    return () => {
      DeliveryEventBus.off(PRODUCT_EVENTS.STOCK_CHANGED, handleProductStockChanged);
    };
  }, [updateProductStock]);
}
