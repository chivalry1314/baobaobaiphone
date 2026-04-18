import type { DeliveryOrder, UserReview } from './index';

/**
 * 通知服务 - 提供统一的通知接口
 */
export class NotificationService {
  /**
   * 显示新订单通知
   */
  static showNewOrderNotification(order: DeliveryOrder): void {
    // 检查浏览器通知权限
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('📦 新订单通知', {
        body: `收到新订单！${order.merchantName} - ¥${order.payableAmount.toFixed(2)}`,
        icon: '/notification-icon.png',
        tag: `order-${order.id}`,
        requireInteraction: true,
      });
    }

    // 显示 Toast 通知（通过自定义事件）
    this.dispatchToastEvent({
      type: 'new-order',
      title: '📦 新订单',
      message: `${order.merchantName} - ¥${order.payableAmount.toFixed(2)}`,
      orderId: order.id,
    });

    // 播放提示音
    playNotificationSound('new-order');
  }

  /**
   * 显示订单状态变更通知
   */
  static showOrderStatusNotification(orderId: string, status: string, merchantName?: string): void {
    const statusTextMap: Record<string, string> = {
      'paid': '已支付',
      'accepted': '商家已接单',
      'preparing': '制作中',
      'delivering': '配送中',
      'completed': '已完成',
      'cancelled': '已取消',
    };

    const statusText = statusTextMap[status] || status;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('📋 订单状态更新', {
        body: `您的订单已${statusText}${merchantName ? ` - ${merchantName}` : ''}`,
        icon: '/notification-icon.png',
        tag: `order-status-${orderId}`,
      });
    }

    // 显示 Toast 通知
    this.dispatchToastEvent({
      type: 'status-change',
      title: '📋 订单状态更新',
      message: `订单已${statusText}`,
      orderId,
    });

    // 播放提示音
    playNotificationSound('status-change');
  }

  /**
   * 显示差评预警
   */
  static showBadReviewAlert(review: UserReview): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⚠️ 差评预警', {
        body: `收到${review.rating}星评价：${review.content.substring(0, 50)}...`,
        icon: '/notification-icon.png',
        tag: `review-${review.id}`,
        requireInteraction: true,
      });
    }

    // 显示 Toast 通知
    this.dispatchToastEvent({
      type: 'bad-review',
      title: '⚠️ 差评预警',
      message: `收到${review.rating}星评价，请及时处理`,
      reviewId: review.id,
    });

    // 播放提示音
    playNotificationSound('review');
  }

  /**
   * 显示普通通知
   */
  static showNotification(title: string, message: string, tag?: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/notification-icon.png',
        tag,
      });
    }

    this.dispatchToastEvent({
      type: 'general',
      title,
      message,
    });
  }

  /**
   * 请求通知权限
   */
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[NotificationService] Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('[NotificationService] Notification permission denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * 分发 Toast 事件（供 UI 组件监听）
   */
  private static dispatchToastEvent(data: {
    type: string;
    title: string;
    message: string;
    orderId?: string;
    reviewId?: string;
  }): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('delivery-notification', {
          detail: data,
        })
      );
    }
  }
}

/**
 * 提示音播放
 */
export function playNotificationSound(type: 'new-order' | 'status-change' | 'review'): void {
  if (typeof window === 'undefined') return;

  // 使用 AudioContext 生成提示音（无需外部文件）
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 根据类型设置不同的音调
    switch (type) {
      case 'new-order':
        // 新订单：高音双响
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        oscillator.frequency.setValueAtTime(1174.66, audioContext.currentTime + 0.1); // D6
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;

      case 'status-change':
        // 状态变更：中音单响
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;

      case 'review':
        // 评价：低音双响
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        oscillator.frequency.setValueAtTime(392, audioContext.currentTime + 0.15); // G4
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
        break;
    }
  } catch (error) {
    console.warn('[playNotificationSound] Failed to play sound:', error);
  }
}
