import type { DeliveryOrder } from '../../../apps/takeout/types';
import type { ShopStatus } from '../../../apps/delivery-seller/types';

const DB_NAME = 'DeliverySharedStorage';
const DB_VERSION = 1;

const STORES = {
  ORDERS: 'orders',
  SHOP_STATUS: 'shop_status',
  PRODUCT_STOCK: 'product_stock',
};

// 获取 IndexedDB 实例
function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建订单存储
      if (!db.objectStoreNames.contains(STORES.ORDERS)) {
        const orderStore = db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
        orderStore.createIndex('merchantId', 'merchantId', { unique: false });
        orderStore.createIndex('status', 'status', { unique: false });
        orderStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 创建店铺状态存储
      if (!db.objectStoreNames.contains(STORES.SHOP_STATUS)) {
        db.createObjectStore(STORES.SHOP_STATUS, { keyPath: 'merchantId' });
      }

      // 创建商品库存存储
      if (!db.objectStoreNames.contains(STORES.PRODUCT_STOCK)) {
        db.createObjectStore(STORES.PRODUCT_STOCK, { keyPath: 'productId' });
      }
    };
  });
}

/**
 * 共享存储类 - 使用 IndexedDB 在两个应用间共享数据
 */
export class DeliverySharedStorage {
  // ============ 订单相关 ============

  /**
   * 获取所有订单
   */
  static async getOrders(): Promise<DeliveryOrder[]> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.ORDERS], 'readonly');
        const store = transaction.objectStore(STORES.ORDERS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[DeliverySharedStorage] Error getting orders:', error);
      return [];
    }
  }

  /**
   * 同步订单
   */
  static async syncOrder(order: DeliveryOrder): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.ORDERS], 'readwrite');
        const store = transaction.objectStore(STORES.ORDERS);
        const request = store.put(order);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[DeliverySharedStorage] Error syncing order:', error);
      throw error;
    }
  }

  /**
   * 根据 ID 获取订单
   */
  static async getOrder(orderId: string): Promise<DeliveryOrder | undefined> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.ORDERS], 'readonly');
        const store = transaction.objectStore(STORES.ORDERS);
        const request = store.get(orderId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[DeliverySharedStorage] Error getting order:', error);
      return undefined;
    }
  }

  /**
   * 删除订单
   */
  static async deleteOrder(orderId: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.ORDERS], 'readwrite');
        const store = transaction.objectStore(STORES.ORDERS);
        const request = store.delete(orderId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[DeliverySharedStorage] Error deleting order:', error);
      throw error;
    }
  }

  // ============ 店铺状态相关 ============

  /**
   * 获取店铺状态
   */
  static async getShopStatus(merchantId: string): Promise<ShopStatus | undefined> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.SHOP_STATUS], 'readonly');
        const store = transaction.objectStore(STORES.SHOP_STATUS);
        const request = store.get(merchantId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[DeliverySharedStorage] Error getting shop status:', error);
      return undefined;
    }
  }

  /**
   * 更新店铺状态
   */
  static async updateShopStatus(merchantId: string, status: ShopStatus): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.SHOP_STATUS], 'readwrite');
        const store = transaction.objectStore(STORES.SHOP_STATUS);
        const request = store.put({ merchantId, ...status });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[DeliverySharedStorage] Error updating shop status:', error);
      throw error;
    }
  }

  // ============ 商品库存相关 ============

  /**
   * 获取商品库存
   */
  static async getProductStock(productId: string): Promise<number> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.PRODUCT_STOCK], 'readonly');
        const store = transaction.objectStore(STORES.PRODUCT_STOCK);
        const request = store.get(productId);

        request.onsuccess = () => {
          resolve(request.result?.stock ?? 0);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[DeliverySharedStorage] Error getting product stock:', error);
      return 0;
    }
  }

  /**
   * 更新商品库存
   */
  static async updateProductStock(productId: string, stock: number): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.PRODUCT_STOCK], 'readwrite');
        const store = transaction.objectStore(STORES.PRODUCT_STOCK);
        const request = store.put({ productId, stock, updatedAt: Date.now() });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[DeliverySharedStorage] Error updating product stock:', error);
      throw error;
    }
  }

  /**
   * 批量更新商品库存
   */
  static async updateProductStocks(stockMap: Map<string, number>): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.PRODUCT_STOCK], 'readwrite');
        const store = transaction.objectStore(STORES.PRODUCT_STOCK);

        stockMap.forEach((stock, productId) => {
          store.put({ productId, stock, updatedAt: Date.now() });
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('[DeliverySharedStorage] Error updating product stocks:', error);
      throw error;
    }
  }

  // ============ 工具方法 ============

  /**
   * 清除所有数据（用于测试或重置）
   */
  static async clearAll(): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(
          [STORES.ORDERS, STORES.SHOP_STATUS, STORES.PRODUCT_STOCK],
          'readwrite'
        );

        transaction.objectStore(STORES.ORDERS).clear();
        transaction.objectStore(STORES.SHOP_STATUS).clear();
        transaction.objectStore(STORES.PRODUCT_STOCK).clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('[DeliverySharedStorage] Error clearing all data:', error);
      throw error;
    }
  }
}
