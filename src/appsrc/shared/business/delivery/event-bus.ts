// 订单事件
export const ORDER_EVENTS = {
  NEW_ORDER: 'order:new',
  STATUS_CHANGED: 'order:status-changed',
  CANCELLED: 'order:cancelled',
};

// 店铺事件
export const SHOP_EVENTS = {
  STATUS_CHANGED: 'shop:status-changed',
  INFO_UPDATED: 'shop:info-updated',
};

// 商品事件
export const PRODUCT_EVENTS = {
  STOCK_CHANGED: 'product:stock-changed',
  STATUS_CHANGED: 'product:status-changed',
};

// 评价事件
export const REVIEW_EVENTS = {
  NEW_REVIEW: 'review:new',
};

// 事件监听器类型
type EventCallback = (data: any) => void;

// 事件总线类
export class DeliveryEventBus {
  private static listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * 触发事件
   */
  static dispatch(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      // 使用 setTimeout 确保异步执行，避免阻塞
      setTimeout(() => {
        callbacks.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error(`[DeliveryEventBus] Error in event listener for ${event}:`, error);
          }
        });
      }, 0);
    }
  }

  /**
   * 监听事件
   */
  static on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * 取消监听事件
   */
  static off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * 清除所有监听器（用于测试或重置）
   */
  static clearAll(): void {
    this.listeners.clear();
  }
}
