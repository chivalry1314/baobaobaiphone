import React from 'react';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import styles from '../SellerApp.module.css';
import type { SellerTab } from '../types';

type SellerTopBarProps = {
  tab: SellerTab;
  isBusy: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onTabChange: (tab: SellerTab) => void;
};

export const SellerTopBar: React.FC<SellerTopBarProps> = ({
  tab,
  isBusy,
  onClose,
  onRefresh,
  onTabChange,
}) => {
  return (
    <>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onClose}>
          <ChevronLeft size={22} />
          <span>返回</span>
        </button>
        <h1 className={styles.title}>商家后台</h1>
        <div className={styles.headerRight}>
          <button className={styles.refreshBtn} onClick={onRefresh} disabled={isBusy}>
            <RefreshCw size={14} /> 刷新
          </button>
        </div>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'messages' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('messages')}
        >
          即时消息
        </button>
        <button
          className={`${styles.tab} ${tab === 'products' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('products')}
        >
          商品管理
        </button>
        <button
          className={`${styles.tab} ${tab === 'stores' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('stores')}
        >
          店铺管理
        </button>
        <button
          className={`${styles.tab} ${tab === 'stats' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('stats')}
        >
          数据统计
        </button>
      </div>
    </>
  );
};
