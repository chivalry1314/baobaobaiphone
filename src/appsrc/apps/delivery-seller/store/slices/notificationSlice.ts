import type { StateCreator } from 'zustand';
import type { DeliverySellerStore, DeliverySellerActions, DeliverySellerState } from '../types';
import type { SystemNotification, NotificationSettings } from '../../types';

type NotificationSliceState = Pick<
  DeliverySellerState,
  'notifications' | 'notificationSettings' | 'unreadNotificationCount'
>;
type NotificationSliceActions = Pick<
  DeliverySellerActions,
  | 'setNotifications'
  | 'addNotification'
  | 'markNotificationRead'
  | 'markAllNotificationsRead'
  | 'setNotificationSettings'
  | 'loadNotifications'
>;

export type NotificationSlice = NotificationSliceState & NotificationSliceActions;

export const createNotificationSlice: StateCreator<
  DeliverySellerStore,
  [['zustand/devtools', never]],
  [],
  NotificationSlice
> = (set, get) => ({
  // State
  notifications: [],
  notificationSettings: {
    orderNotification: true,
    reviewNotification: true,
    marketingNotification: true,
    soundEnabled: true,
    vibrateEnabled: true,
  },
  unreadNotificationCount: 0,

  // Actions
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    set({ notifications, unreadNotificationCount: unreadCount }, false, 'notifications/setNotifications');
  },

  addNotification: (notification) => {
    set((state) => {
      const newNotifications = [notification, ...state.notifications];
      const unreadCount = newNotifications.filter((n) => !n.isRead).length;
      return {
        notifications: newNotifications,
        unreadNotificationCount: unreadCount,
      };
    }, false, 'notifications/addNotification');
  },

  markNotificationRead: (notificationId) => {
    set((state) => {
      const newNotifications = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      const unreadCount = newNotifications.filter((n) => !n.isRead).length;
      return {
        notifications: newNotifications,
        unreadNotificationCount: unreadCount,
      };
    }, false, 'notifications/markNotificationRead');
  },

  markAllNotificationsRead: () => {
    set((state) => {
      const newNotifications = state.notifications.map((n) => ({ ...n, isRead: true }));
      return {
        notifications: newNotifications,
        unreadNotificationCount: 0,
      };
    }, false, 'notifications/markAllNotificationsRead');
  },

  setNotificationSettings: (settings) => {
    set((state) => ({
      notificationSettings: { ...state.notificationSettings, ...settings },
    }), false, 'notifications/setNotificationSettings');
  },

  loadNotifications: () => {
    const notifications = generateMockNotifications();
    get().setNotifications(notifications);
  },
});

// 生成模拟通知数据
const generateMockNotifications = (): SystemNotification[] => {
  const now = Date.now();
  
  return [
    {
      id: 'notif_1',
      type: 'system',
      title: '平台公告',
      content: '尊敬商家：平台将于本周末进行系统升级，届时可能影响部分功能使用，请提前做好准备。',
      isRead: false,
      createdAt: now - 2 * 60 * 60 * 1000, // 2 小时前
    },
    {
      id: 'notif_2',
      type: 'order',
      title: '新订单提醒',
      content: '您有新的外卖订单，请及时处理',
      isRead: false,
      createdAt: now - 30 * 60 * 1000, // 30 分钟前
      actionUrl: '/orders',
    },
    {
      id: 'notif_3',
      type: 'review',
      title: '新评价通知',
      content: '您收到了一条新的用户评价',
      isRead: true,
      createdAt: now - 5 * 60 * 60 * 1000, // 5 小时前
      actionUrl: '/reviews',
    },
    {
      id: 'notif_4',
      type: 'marketing',
      title: '活动报名提醒',
      content: '双 12 大促活动开始报名啦！报名可享流量扶持',
      isRead: true,
      createdAt: now - 24 * 60 * 60 * 1000, // 1 天前
      actionUrl: '/marketing',
    },
    {
      id: 'notif_5',
      type: 'system',
      title: '系统消息',
      content: '您的店铺信息已审核通过',
      isRead: true,
      createdAt: now - 3 * 24 * 60 * 60 * 1000, // 3 天前
    },
  ];
};
