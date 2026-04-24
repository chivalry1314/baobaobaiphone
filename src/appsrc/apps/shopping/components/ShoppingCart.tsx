import React from 'react';
import type { Address } from '../types';
import type { GoodsKind, ShippingMode } from '../uiTypes';
import { formatMoney } from '../utils';
import styles from '../ShoppingApp.module.css';

export interface ShoppingCartLine {
  id: string;
  name: string;
  desc: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface ShoppingCartGroup {
  kind: GoodsKind;
  storeId: string;
  storeName: string;
  storeTypeName?: string;
  storeSignboard?: string;
  storeDecoration?: string;
  count: number;
  total: number;
  lines: ShoppingCartLine[];
}

interface ShoppingCartProps {
  groups: ShoppingCartGroup[];
  totalCount: number;
  totalAmount: number;
  shippingMode: ShippingMode;
  scheduleDate: string;
  scheduleTime: string;
  defaultAddress?: Address;
  addressTab: 'address' | 'gift';
  giftContacts: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  selectedGiftContactId: string;
  onSwitchAddress: () => void;
  onManageAddress: () => void;
  onAddressTabChange: (tab: 'address' | 'gift') => void;
  onGiftContactSelect: (contactId: string) => void;
  onShippingModeChange: (mode: ShippingMode) => void;
  onScheduleDateChange: (value: string) => void;
  onScheduleTimeChange: (value: string) => void;
  onCheckoutAll: () => void;
  onGoHome: () => void;
  isLineSelected: (kind: GoodsKind, storeId: string, productId: string) => boolean;
  onToggleLineSelected: (kind: GoodsKind, storeId: string, productId: string, selected: boolean) => void;
  onAddOne: (kind: GoodsKind, storeId: string, productId: string) => void;
  onRemoveOne: (kind: GoodsKind, storeId: string, productId: string) => void;
  onClearStore: (kind: GoodsKind, storeId: string) => void;
}

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

export const ShoppingCart: React.FC<ShoppingCartProps> = ({
  groups,
  totalCount,
  totalAmount,
  shippingMode,
  scheduleDate,
  scheduleTime,
  defaultAddress,
  addressTab,
  giftContacts,
  selectedGiftContactId,
  onSwitchAddress,
  onManageAddress,
  onAddressTabChange,
  onGiftContactSelect,
  onShippingModeChange,
  onScheduleDateChange,
  onScheduleTimeChange,
  onCheckoutAll,
  onGoHome,
  isLineSelected,
  onToggleLineSelected,
  onAddOne,
  onRemoveOne,
  onClearStore,
}) => {
  const getGiftContactInitials = (name: string) => {
    const normalized = name.trim();
    if (!normalized) return '?';
    return normalized.slice(0, 2).toUpperCase();
  };

  if (groups.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.empty}>
          <p>购物车为空，先去逛逛商品吧。</p>
          <button className={styles.primaryBtn} onClick={onGoHome}>
            去首页
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.detailCard}>
        <div className={styles.addressTabs}>
          <button
            type="button"
            className={`${styles.addressTabBtn} ${addressTab === 'address' ? styles.addressTabBtnActive : ''}`}
            onClick={() => onAddressTabChange('address')}
          >
            收货地址
          </button>
          <button
            type="button"
            className={`${styles.addressTabBtn} ${addressTab === 'gift' ? styles.addressTabBtnActive : ''}`}
            onClick={() => onAddressTabChange('gift')}
          >
            送TA礼物
          </button>
        </div>
        {addressTab === 'address' ? (
          defaultAddress ? (
            <div className={styles.addressBlock}>
              <div className={styles.addressTop}>
                <strong>{defaultAddress.name}</strong>
                <span>{defaultAddress.phone}</span>
              </div>
              <p>{defaultAddress.address}</p>
              <div className={styles.addressActions}>
                <button className={styles.smallBtn} onClick={onSwitchAddress}>
                  切换地址
                </button>
                <button className={styles.smallBtn} onClick={onManageAddress}>
                  管理地址
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={styles.muted}>暂无地址，请先添加。</p>
              <div className={styles.addressActions}>
                <button className={styles.smallBtn} onClick={onSwitchAddress}>
                  去选择地址
                </button>
              </div>
            </>
          )
        ) : giftContacts.length > 0 ? (
          <>
            <div className={styles.giftContactList}>
              {giftContacts.map((contact) => {
                const selected = contact.id === selectedGiftContactId;
                return (
                  <button
                    key={contact.id}
                    type="button"
                    className={`${styles.giftContactItem} ${selected ? styles.giftContactItemActive : ''}`}
                    onClick={() => onGiftContactSelect(contact.id)}
                  >
                    <span className={styles.giftContactAvatar}>
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name} className={styles.giftContactAvatarImage} />
                      ) : (
                        <span>{getGiftContactInitials(contact.name)}</span>
                      )}
                    </span>
                    <span className={styles.giftContactName}>{contact.name}</span>
                  </button>
                );
              })}
            </div>
            <p className={styles.giftContactHint}>物流送达后，会自动把礼物卡片发到对应微信聊天框。</p>
          </>
        ) : (
          <p className={styles.muted}>通讯录里还没有可送礼的人。</p>
        )}
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
        {shippingMode === 'schedule' ? (
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
        ) : null}
      </div>

      <div className={styles.detailCard}>
        <div className={styles.cartMergeSummary}>
          <strong>合并支付</strong>
          <span>
            已选 {totalCount} 件，合计 {formatMoney(totalAmount)}
          </span>
        </div>
      </div>

      {groups.map((group) => (
        <div key={`${group.kind}-${group.storeId}`} className={styles.detailCard}>
          <div className={styles.cartStoreHeader}>
            <div className={styles.cartStoreMeta}>
              <span className={styles.storeSignboardInline} data-kind={group.kind}>
                <span className={styles.storeSignboardText}>
                  {resolveStoreTitle(group.storeSignboard, group.storeName)}
                </span>
              </span>
              <span>{resolveStoreDecorationBadge(group.storeDecoration)}</span>
              <span>{group.storeTypeName || group.storeName}</span>
            </div>
            <button
              className={`${styles.smallBtn} ${styles.cartStoreClearBtn}`}
              onClick={() => onClearStore(group.kind, group.storeId)}
            >
              清空店铺
            </button>
          </div>

          <div className={styles.cartItemList}>
            {group.lines.map((line) => {
              const selected = isLineSelected(group.kind, group.storeId, line.id);
              return (
                <div key={`${group.kind}-${group.storeId}-${line.id}`} className={styles.cartItemRow}>
                  <label className={styles.cartItemCheck}>
                    <input
                      type="checkbox"
                      className={styles.cartItemCheckbox}
                      checked={selected}
                      onChange={(event) =>
                        onToggleLineSelected(group.kind, group.storeId, line.id, event.target.checked)
                      }
                    />
                  </label>
                  <div className={styles.cartItemInfo}>
                    <strong>{line.name}</strong>
                    <span>{line.desc || '商品'}</span>
                  </div>
                  <div className={styles.cartItemQty}>x{line.qty}</div>
                  <div className={styles.cartItemPrice}>{formatMoney(line.subtotal)}</div>
                  <div className={styles.cartItemActions}>
                    <button className={styles.smallBtn} onClick={() => onAddOne(group.kind, group.storeId, line.id)}>
                      添加1件
                    </button>
                    <button
                      className={styles.smallBtnDanger}
                      onClick={() => onRemoveOne(group.kind, group.storeId, line.id)}
                    >
                      移除1件
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.cartStoreFooter}>
            <span>{group.count} 件商品</span>
            <strong>{formatMoney(group.total)}</strong>
          </div>
        </div>
      ))}

      <button className={styles.primaryBtn} onClick={onCheckoutAll} disabled={totalCount === 0}>
        合并支付 ({formatMoney(totalAmount)})
      </button>
    </section>
  );
};
