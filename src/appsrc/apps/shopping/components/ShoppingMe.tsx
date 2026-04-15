import React from 'react';
import { Heart, ListOrdered, MapPinned, Settings, User } from 'lucide-react';
import styles from '../ShoppingApp.module.css';

interface ShoppingMeProps {
  ordersCount: number;
  favoritesCount: number;
  addressesCount: number;
  onGoOrders: () => void;
  onGoFavorites: () => void;
  onGoAddresses: () => void;
  onGoSettings: () => void;
}

export const ShoppingMe: React.FC<ShoppingMeProps> = ({
  ordersCount,
  favoritesCount,
  addressesCount,
  onGoOrders,
  onGoFavorites,
  onGoAddresses,
  onGoSettings
}) => {
  return (
    <section className={styles.section}>
      <div className={styles.meHeader}>
        <div className={styles.avatar}>
          <User size={20} />
        </div>
        <div>
          <h2>Hi，欢迎回来</h2>
          <p className={styles.muted}>管理订单、收藏与地址</p>
        </div>
      </div>

      <div className={styles.menuList}>
        <button className={styles.menuItem} onClick={onGoOrders}>
          <ListOrdered size={18} />
          <span>我的订单</span>
          <em>{ordersCount}</em>
        </button>
        <button className={styles.menuItem} onClick={onGoFavorites}>
          <Heart size={18} />
          <span>我的收藏</span>
          <em>{favoritesCount}</em>
        </button>
        <button className={styles.menuItem} onClick={onGoAddresses}>
          <MapPinned size={18} />
          <span>地址管理</span>
          <em>{addressesCount}</em>
        </button>
        <button className={styles.menuItem} onClick={onGoSettings}>
          <Settings size={18} />
          <span>设置</span>
          <em />
        </button>
      </div>
    </section>
  );
};
