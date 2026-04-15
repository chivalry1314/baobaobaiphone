import React from 'react';
import type { Address, ProductItem } from '../types';
import type { GoodsKind, ShippingMode } from '../uiTypes';
import { formatMoney, groupCartLines } from '../utils';
import styles from '../ShoppingApp.module.css';

const resolveStoreDecorationBadge = (value: string | undefined) => {
  const normalized = (value || '').trim();
  if (!normalized || normalized === '?' || normalized === '？') return '✨';
  return normalized;
};

const resolveStoreTitle = (signboard: string | undefined, fallback: string) => {
  const normalized = (signboard || '').trim();
  if (!normalized || normalized === '?' || normalized === '？') return fallback;
  return normalized;
};

interface ShoppingGoodsCheckoutProps {
  kind: GoodsKind;
  storeName: string;
  storeTypeName?: string;
  storeSignboard?: string;
  storeDecoration?: string;
  cart: ProductItem[];
  shippingMode: ShippingMode;
  scheduleDate: string;
  scheduleTime: string;
  defaultAddress?: Address;
  onShippingModeChange: (mode: ShippingMode) => void;
  onScheduleDateChange: (value: string) => void;
  onScheduleTimeChange: (value: string) => void;
  onManageAddress: () => void;
  onPlaceOrder: () => void;
  onBackToList: () => void;
}

export const ShoppingGoodsCheckout: React.FC<ShoppingGoodsCheckoutProps> = ({
  kind,
  storeName,
  storeTypeName,
  storeSignboard,
  storeDecoration,
  cart,
  shippingMode,
  scheduleDate,
  scheduleTime,
  defaultAddress,
  onShippingModeChange,
  onScheduleDateChange,
  onScheduleTimeChange,
  onManageAddress,
  onPlaceOrder,
  onBackToList,
}) => {
  const isDessert = kind === 'dessert';

  if (cart.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.empty}>
          <p>购物车为空。</p>
          <button className={styles.primaryBtn} onClick={onBackToList}>
            返回{isDessert ? '甜品店' : '鲜花店'}
          </button>
        </div>
      </section>
    );
  }

  const lines = groupCartLines(cart);
  const total = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);

  return (
    <section className={styles.section}>
      <div className={styles.detailCard}>
        <h3>店铺信息</h3>
        <div className={styles.checkoutStoreRow}>
          <span className={styles.storeSignboardInline} data-kind={kind}>
            <span className={styles.storeSignboardText}>{resolveStoreTitle(storeSignboard, storeName)}</span>
          </span>
          <span>{resolveStoreDecorationBadge(storeDecoration)}</span>
          <span>{storeTypeName || storeName}</span>
        </div>
      </div>

      <div className={styles.detailCard}>
        <h3>配送方式</h3>
        <div className={styles.shipModes}>
          <button
            className={`${styles.shipModeBtn} ${shippingMode === 'now' ? styles.shipModeActive : ''}`}
            onClick={() => onShippingModeChange('now')}
          >
            立即发货
          </button>
          <button
            className={`${styles.shipModeBtn} ${shippingMode === 'schedule' ? styles.shipModeActive : ''}`}
            onClick={() => onShippingModeChange('schedule')}
          >
            预约发货
          </button>
        </div>
        {shippingMode === 'schedule' && (
          <div className={styles.shipSchedule}>
            <div className={styles.formRow}>
              <label>日期</label>
              <input type="date" value={scheduleDate} onChange={(e) => onScheduleDateChange(e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label>时间</label>
              <input type="time" value={scheduleTime} onChange={(e) => onScheduleTimeChange(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className={styles.detailCard}>
        <h3>配送地址</h3>
        {defaultAddress ? (
          <div className={styles.addressBlock}>
            <div className={styles.addressTop}>
              <strong>{defaultAddress.name}</strong>
              <span>{defaultAddress.phone}</span>
            </div>
            <p>{defaultAddress.address}</p>
            <div className={styles.addressActions}>
              <button className={styles.smallBtn} onClick={onManageAddress}>
                管理地址
              </button>
            </div>
          </div>
        ) : (
          <p className={styles.muted}>暂无地址，请先添加。</p>
        )}
      </div>

      <div className={styles.detailCard}>
        <h3>商品明细</h3>
        <div className={styles.detailLines}>
          {lines.map((line) => (
            <div key={line.name}>
              <span>{line.name}</span>
              <em>x{line.qty}</em>
              <strong>{formatMoney(line.qty * line.unitPrice)}</strong>
            </div>
          ))}
        </div>
      </div>

      <button className={styles.primaryBtn} onClick={onPlaceOrder}>
        提交订单 ({formatMoney(total)})
      </button>
    </section>
  );
};
