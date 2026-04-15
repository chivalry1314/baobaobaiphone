import React from 'react';
import { Camera, ClipboardList, Headset, History, Search, ShoppingCart, TicketPercent } from 'lucide-react';
import type { CommerceStore } from '../types';
import { resolveStoreHeroBackground } from '../../../shared/business/commerce/domain/storeDecoration';
import { resolveStoreTypeTabLabel } from '../../../shared/business/commerce/domain/storeTypeTabs';
import styles from '../ShoppingApp.module.css';

interface ShoppingHomeProps {
  ordersCount: number;
  cartCount: number;
  favoritesCount: number;
  addressesCount: number;
  stores: CommerceStore[];
  topTabs: string[];
  activeTopTab: string;
  onSwitchTopTab: (tab: string) => void;
  onGoStore: (store: CommerceStore) => void;
  onGoOrders: () => void;
  onGoCart: () => void;
}

type QuickEntry = {
  id: 'orders' | 'cart' | 'coupon' | 'service' | 'history';
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: string;
};

const quickEntryBase: QuickEntry[] = [
  { id: 'orders', label: '我的订单', icon: ClipboardList },
  { id: 'cart', label: '购物车', icon: ShoppingCart },
  { id: 'coupon', label: '优惠券', icon: TicketPercent, badge: '60元券' },
  { id: 'service', label: '客服消息', icon: Headset },
  { id: 'history', label: '商品足迹', icon: History },
];

const cardSubTitle = 'Independent Creator';

const resolveStoreTitle = (store: CommerceStore) => {
  return store.signboard?.trim() || store.name;
};

const resolveStoreDesc = (store: CommerceStore) => {
  const raw = store.typeName?.trim();
  if (!raw) return store.name;
  return raw;
};

const resolveStoreLogo = (store: CommerceStore) => {
  const raw = store.logo?.trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('http')) return `url(${raw})`;
  return raw;
};

const resolveStoreTileBackground = (store: CommerceStore) => {
  return resolveStoreHeroBackground(store, '');
};

export const ShoppingHome: React.FC<ShoppingHomeProps> = ({
  ordersCount,
  cartCount,
  favoritesCount,
  addressesCount,
  stores,
  topTabs,
  activeTopTab,
  onSwitchTopTab,
  onGoStore,
  onGoOrders,
  onGoCart,
}) => {
  const [searchKeyword, setSearchKeyword] = React.useState('');
  const visibleStores = React.useMemo(() => stores.filter((store) => store.visible), [stores]);
  const storesByTab = React.useMemo(() => {
    if (activeTopTab === '推荐') return visibleStores;
    if (activeTopTab === '上新') {
      return [...visibleStores].sort((left, right) => right.updatedAt - left.updatedAt);
    }
    return visibleStores.filter((store) => resolveStoreTypeTabLabel(store) === activeTopTab);
  }, [activeTopTab, visibleStores]);
  const filteredStores = React.useMemo(() => {
    const query = searchKeyword.trim().toLowerCase();
    if (!query) return storesByTab;
    return storesByTab.filter((store) => {
      const name = (store.name || '').toLowerCase();
      const signboard = (store.signboard || '').toLowerCase();
      return name.includes(query) || signboard.includes(query);
    });
  }, [searchKeyword, storesByTab]);

  const quickEntries = React.useMemo(() => {
    return quickEntryBase.map((item) => {
      if (item.id === 'orders') return { ...item, count: ordersCount };
      if (item.id === 'cart') return { ...item, count: cartCount };
      if (item.id === 'history') return { ...item, count: addressesCount };
      return { ...item, count: 0 };
    });
  }, [addressesCount, cartCount, ordersCount]);

  return (
    <section className={styles.marketHome}>
      <form className={styles.marketSearchBar} onSubmit={(event) => event.preventDefault()}>
        <div className={styles.marketSearchInput}>
          <Search size={16} />
          <input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="搜索店铺名称"
            aria-label="搜索店铺名称"
          />
        </div>
        <button type="button" className={styles.marketSearchAction} aria-label="拍照搜索">
          <Camera size={17} />
        </button>
        <button type="submit" className={styles.marketSearchSubmit}>搜索</button>
      </form>

      <div className={styles.marketTopTabs}>
        {topTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.marketTopTab} ${tab === activeTopTab ? styles.marketTopTabActive : ''}`}
            onClick={() => onSwitchTopTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.marketQuickActions}>
        {quickEntries.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              className={styles.marketQuickAction}
              onClick={() => {
                if (entry.id === 'orders') onGoOrders();
                if (entry.id === 'cart') onGoCart();
              }}
            >
              <div className={styles.marketQuickIcon}>
                {entry.badge ? <em>{entry.badge}</em> : null}
                <Icon size={20} />
              </div>
              <span>{entry.label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.storeCardsGrid}>
        {filteredStores.map((store) => (
          <button
            key={store.id}
            className={styles.storeTile}
            onClick={() => onGoStore(store)}
            aria-label={`进入${resolveStoreTitle(store)}`}
          >
            <div
              className={`${styles.storeTileCover} ${resolveStoreTileBackground(store) ? '' : styles.storeTileCoverMint}`}
              style={{ backgroundImage: resolveStoreTileBackground(store) || undefined }}
            />
            <div className={styles.storeTileBody}>
              <div
                className={styles.storeTileAvatar}
                style={{ backgroundImage: resolveStoreLogo(store) || undefined }}
              />
              <strong>{resolveStoreTitle(store)}</strong>
              <span>{resolveStoreDesc(store)}</span>
              <p>{cardSubTitle}</p>
            </div>
          </button>
        ))}
      </div>
      {filteredStores.length === 0 ? <p className={styles.storeSearchEmpty}>未找到匹配店铺</p> : null}
    </section>
  );
};
