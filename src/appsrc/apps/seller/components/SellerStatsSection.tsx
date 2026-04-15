import React from 'react';
import styles from '../SellerApp.module.css';
import { formatMoney } from '../../../shared/business/commerce/domain/utils';
import type { CommerceStore } from '../../../shared/business/commerce/domain/types';

type StoreStatsItem = {
  store: CommerceStore;
  revenue: number;
  orderCount: number;
  inTransit: number;
};

type RankingItem = {
  name: string;
  count: number;
};

type SellerStatsSectionProps = {
  lastRefreshedAt: number;
  statsTypeFilter: string;
  statsTypeTabs: string[];
  filteredStatsByStore: StoreStatsItem[];
  ranking: RankingItem[];
  onStatsTypeFilterChange: (value: string) => void;
};

export const SellerStatsSection: React.FC<SellerStatsSectionProps> = ({
  lastRefreshedAt,
  statsTypeFilter,
  statsTypeTabs,
  filteredStatsByStore,
  ranking,
  onStatsTypeFilterChange,
}) => {
  return (
    <>
      <section className={styles.card}>
        <h3>近 30 天店铺统计</h3>
        <p className={styles.tip}>最近刷新：{new Date(lastRefreshedAt).toLocaleString('zh-CN')}</p>
        <div className={styles.filterTabs}>
          <button
            className={`${styles.filterTab} ${
              statsTypeFilter === 'all' ? styles.filterTabActive : ''
            }`}
            onClick={() => onStatsTypeFilterChange('all')}
          >
            全部类型
          </button>
          {statsTypeTabs.map((typeName) => (
            <button
              key={typeName}
              className={`${styles.filterTab} ${
                statsTypeFilter === typeName ? styles.filterTabActive : ''
              }`}
              onClick={() => onStatsTypeFilterChange(typeName)}
            >
              {typeName}
            </button>
          ))}
        </div>
        <div className={styles.statGrid}>
          {filteredStatsByStore.map((item) => (
            <div key={item.store.id} className={styles.statItem}>
              <div>
                <strong>{item.store.signboard || item.store.name}</strong>
                <span>订单 {item.orderCount} / 配送中 {item.inTransit}</span>
              </div>
              <div className={styles.statMoney}>{formatMoney(item.revenue)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <h3>全部店铺下单数排行（按人数）</h3>
        <div className={styles.statGrid}>
          {ranking.map((entry, index) => (
            <div key={entry.name} className={styles.rankRow}>
              <div className={styles.rankName}>
                <span className={styles.rankNo}>{index + 1}</span>
                <span>{entry.name}</span>
              </div>
              <strong>{entry.count} 人</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};
