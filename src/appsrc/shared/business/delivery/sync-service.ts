import { DeliverySharedStorage, DeliveryEventBus, ORDER_EVENTS, SHOP_EVENTS, PRODUCT_EVENTS } from './index';
import type { DeliveryOrder, ShopStatus } from './index';

/**
 * 数据同步服务
 */
export class SyncService {
  private static syncIntervalId: number | null = null;
  private static readonly SYNC_INTERVAL_MS = 30000; // 30 秒

  /**
   * 初始化同步
   * 应用启动时调用，同步最新数据
   */
  static async initializeSync(merchantId?: string): Promise<void> {
    try {
      await Promise.all([
        this.syncOrders(),
        this.syncShopStatus(merchantId),
        this.syncProductStock(),
      ]);
      console.log('[SyncService] Initial sync completed');
    } catch (error) {
      console.error('[SyncService] Initial sync failed:', error);
    }
  }

  /**
   * 启动定时同步
   */
  static startPeriodicSync(merchantId?: string): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    this.syncIntervalId = window.setInterval(() => {
      this.syncOrders();
      this.syncProductStock();
      if (merchantId) {
        this.syncShopStatus(merchantId);
      }
    }, this.SYNC_INTERVAL_MS);

    console.log('[SyncService] Periodic sync started');
  }

  /**
   * 停止定时同步
   */
  static stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('[SyncService] Periodic sync stopped');
    }
  }

  /**
   * 同步订单
   * 从本地存储读取订单，与共享存储对比
   */
  static async syncOrders(): Promise<void> {
    try {
      const sharedOrders = await DeliverySharedStorage.getOrders();
      
      // 触发订单更新事件
      if (sharedOrders.length > 0) {
        DeliveryEventBus.dispatch('orders:synced', sharedOrders);
      }
    } catch (error) {
      console.error('[SyncService] Failed to sync orders:', error);
    }
  }

  /**
   * 同步店铺状态
   */
  static async syncShopStatus(merchantId?: string): Promise<void> {
    if (!merchantId) return;

    try {
      const sharedStatus = await DeliverySharedStorage.getShopStatus(merchantId);
      
      if (sharedStatus) {
        DeliveryEventBus.dispatch(SHOP_EVENTS.STATUS_CHANGED, sharedStatus);
      }
    } catch (error) {
      console.error('[SyncService] Failed to sync shop status:', error);
    }
  }

  /**
   * 同步商品库存
   */
  static async syncProductStock(): Promise<void> {
    try {
      // 这里可以从共享存储读取所有库存数据
      // 实际实现中可能需要遍历所有商品
      DeliveryEventBus.dispatch('stocks:synced', {});
    } catch (error) {
      console.error('[SyncService] Failed to sync product stock:', error);
    }
  }

  /**
   * 推送订单到共享存储
   */
  static async pushOrder(order: DeliveryOrder): Promise<void> {
    try {
      await DeliverySharedStorage.syncOrder(order);
      console.log('[SyncService] Order pushed to shared storage:', order.id);
    } catch (error) {
      console.error('[SyncService] Failed to push order:', error);
      throw error;
    }
  }

  /**
   * 推送店铺状态到共享存储
   */
  static async pushShopStatus(merchantId: string, status: ShopStatus): Promise<void> {
    try {
      await DeliverySharedStorage.updateShopStatus(merchantId, status);
      console.log('[SyncService] Shop status pushed to shared storage:', merchantId);
    } catch (error) {
      console.error('[SyncService] Failed to push shop status:', error);
      throw error;
    }
  }

  /**
   * 推送商品库存到共享存储
   */
  static async pushProductStock(productId: string, stock: number): Promise<void> {
    try {
      await DeliverySharedStorage.updateProductStock(productId, stock);
      console.log('[SyncService] Product stock pushed to shared storage:', productId);
    } catch (error) {
      console.error('[SyncService] Failed to push product stock:', error);
      throw error;
    }
  }
}

/**
 * 初始化同步（导出为便捷函数）
 */
export async function initializeSync(merchantId?: string): Promise<void> {
  await SyncService.initializeSync(merchantId);
}

/**
 * 启动定时同步（导出为便捷函数）
 */
export function startPeriodicSync(merchantId?: string): void {
  SyncService.startPeriodicSync(merchantId);
}

/**
 * 停止定时同步（导出为便捷函数）
 */
export function stopPeriodicSync(): void {
  SyncService.stopPeriodicSync();
}
