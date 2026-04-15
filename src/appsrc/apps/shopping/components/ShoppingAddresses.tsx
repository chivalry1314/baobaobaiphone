import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plus } from 'lucide-react';
import type { Address } from '../types';
import styles from '../ShoppingApp.module.css';

interface ShoppingAddressesProps {
  addresses: Address[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  actionMode?: 'default' | 'select';
  selectedAddressId?: string;
  actionHint?: string;
  showDelete?: boolean;
  onPrimaryAction: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

export const ShoppingAddresses: React.FC<ShoppingAddressesProps> = ({
  addresses,
  scrollRef,
  actionMode = 'default',
  selectedAddressId,
  actionHint,
  showDelete = true,
  onPrimaryAction,
  onEdit,
  onRemove,
  onAdd
}) => {
  const virtualizer = useVirtualizer({
    count: addresses.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 130,
    overscan: 8,
  });

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>收货地址</h2>
        <p>{actionHint || '下单会优先使用默认地址'}</p>
      </div>

      <div>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const addr = addresses[virtualItem.index];
            if (!addr) return null;
            const isSelectMode = actionMode === 'select';
            const isSelected = isSelectMode && selectedAddressId === addr.id;
            return (
              <div
                key={addr.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  paddingBottom: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <div
                  className={`${styles.addressCard} ${isSelectMode ? styles.addressCardSelectable : ''} ${
                    isSelected ? styles.addressCardSelected : ''
                  }`}
                  onClick={isSelectMode ? () => onPrimaryAction(addr.id) : undefined}
                  role={isSelectMode ? 'button' : undefined}
                  tabIndex={isSelectMode ? 0 : undefined}
                  onKeyDown={
                    isSelectMode
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onPrimaryAction(addr.id);
                          }
                        }
                      : undefined
                  }
                >
                  <div className={styles.addressTop}>
                    <strong>{addr.name}</strong>
                    <span>{addr.phone}</span>
                    {addr.isDefault && <em className={styles.defaultBadge}>默认</em>}
                  </div>
                  <p>{addr.address}</p>
                  <div className={styles.addressActions}>
                    {isSelectMode ? null : (
                      <button
                        className={styles.smallBtn}
                        onClick={(event) => {
                          event.stopPropagation();
                          onPrimaryAction(addr.id);
                        }}
                      >
                        设为默认
                      </button>
                    )}
                    <button
                      className={styles.smallBtn}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(addr.id);
                      }}
                    >
                      编辑
                    </button>
                    {showDelete ? (
                      <button
                        className={styles.smallBtnDanger}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemove(addr.id);
                        }}
                      >
                        删除
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button className={styles.addCard} onClick={onAdd} style={{ marginTop: '12px' }}>
          <Plus size={18} />
          新增地址
        </button>
      </div>
    </section>
  );
};
