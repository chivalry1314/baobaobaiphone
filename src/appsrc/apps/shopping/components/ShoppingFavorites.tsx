import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Trash2 } from 'lucide-react';
import type { Favorite } from '../types';
import { palettes } from '../data';
import { formatMoney } from '../utils';
import styles from '../ShoppingApp.module.css';

interface ShoppingFavoritesProps {
  favorites: Favorite[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onRemove: (favorite: Favorite) => void;
  onGoHome: () => void;
}

export const ShoppingFavorites: React.FC<ShoppingFavoritesProps> = ({
  favorites,
  scrollRef,
  onRemove,
  onGoHome
}) => {
  const virtualizer = useVirtualizer({
    count: favorites.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 110,
    overscan: 8,
  });

  return (
    <section className={styles.section}>
      {favorites.length === 0 ? (
        <div className={styles.empty}>
          <p>还没有收藏。</p>
          <button className={styles.primaryBtn} onClick={onGoHome}>
            去首页看看
          </button>
        </div>
      ) : (
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const favorite = favorites[virtualItem.index];
            if (!favorite) return null;
            return (
              <div
                key={`${favorite.kind}-${favorite.id}`}
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
                <div className={styles.favCard}>
                  <div
                    className={styles.favThumb}
                    style={{ backgroundImage: palettes[virtualItem.index % palettes.length] }}
                  />
                  <div className={styles.favInfo}>
                    <strong>{favorite.name}</strong>
                    <p>{favorite.desc}</p>
                    <em>{formatMoney(favorite.price)}</em>
                  </div>
                  <button className={styles.iconBtn} aria-label="取消收藏" onClick={() => onRemove(favorite)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
