import React from 'react';
import { Home, ListOrdered, ShoppingCart, User } from 'lucide-react';
import type { TabKey } from '../uiTypes';
import styles from '../ShoppingApp.module.css';

interface ShoppingTabBarProps {
  tab: TabKey;
  onSwitch: (tab: TabKey) => void;
}

const tabItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'home', label: '首页', icon: <Home size={20} /> },
  { key: 'cart', label: '购物车', icon: <ShoppingCart size={20} /> },
  { key: 'orders', label: '订单', icon: <ListOrdered size={20} /> },
  { key: 'me', label: '我的', icon: <User size={20} /> }
];

export const ShoppingTabBar: React.FC<ShoppingTabBarProps> = ({ tab, onSwitch }) => {
  return (
    <nav className={styles.tabBar}>
      {tabItems.map((item) => (
        <button
          key={item.key}
          className={`${styles.tabItem} ${tab === item.key ? styles.tabItemActive : ''}`}
          onClick={() => onSwitch(item.key)}
        >
          <div className={styles.tabIcon}>{item.icon}</div>
          <div className={styles.tabLabel}>{item.label}</div>
        </button>
      ))}
    </nav>
  );
};
