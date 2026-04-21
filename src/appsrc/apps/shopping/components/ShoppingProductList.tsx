import React from 'react';
import { ChevronRight, Heart, MessageCircle, Plus, ShoppingCart } from 'lucide-react';
import {
  DEFAULT_STORE_FILTER_LABELS,
  DEFAULT_STORE_HERO_RATING_LABELS,
  DEFAULT_STORE_HERO_TAG_LABELS,
  DEFAULT_STORE_TAB_LABELS,
} from '../../../shared/business/commerce/domain/storeDecoration';
import type { ProductItem } from '../types';
import type { GoodsKind } from '../uiTypes';
import { palettes } from '../data';
import { formatMoney } from '../utils';
import styles from '../ShoppingApp.module.css';

const toBackgroundImage = (img: string | undefined, fallback: string) => {
  if (!img) return fallback;
  if (img.startsWith('data:') || img.startsWith('http')) return `url(${img})`;
  return img;
};

const normalizeText = (value: string | undefined): string => (value || '').trim();

const resolveStoreBadge = (value: string | undefined) => {
  const normalized = normalizeText(value);
  if (!normalized || normalized === '?' || normalized === '？') return '·';
  return normalized;
};

const resolveStoreTitle = (value: string | undefined, fallback: string) => {
  const normalized = normalizeText(value);
  if (!normalized || normalized === '?' || normalized === '？') return normalizeText(fallback) || '店铺';
  return normalized;
};

interface ShoppingProductListProps {
  kind: GoodsKind;
  storeName: string;
  storeTypeName?: string;
  storeDescription?: string;
  storeSignboard?: string;
  storeDecoration?: string;
  storeLogo?: string;
  storeCover?: string;
  storeTheme?: string;
  tabLabels?: string[];
  filterLabels?: string[];
  heroRatingLabels?: string[];
  heroTagLabels?: string[];
  products: ProductItem[];
  cart: ProductItem[];
  cartTotal: number;
  isFavorited: (id: string) => boolean;
  onToggleFavorite: (product: ProductItem) => void;
  onAddToCart: (id: string) => void;
  onClearCart: () => void;
  onOpenCart: () => void;
  onCheckout: () => void;
}

export const ShoppingProductList: React.FC<ShoppingProductListProps> = ({
  kind,
  storeName,
  storeTypeName,
  storeDescription,
  storeSignboard,
  storeDecoration,
  storeLogo,
  storeCover,
  storeTheme,
  tabLabels,
  filterLabels,
  heroRatingLabels,
  heroTagLabels,
  products,
  cart,
  cartTotal,
  isFavorited,
  onToggleFavorite,
  onAddToCart,
  onOpenCart,
}) => {
  const storeTitle = resolveStoreTitle(storeSignboard, storeName);
  const storeSubTitle = resolveStoreTitle(storeTypeName, storeName);
  const storeDescriptionText = normalizeText(storeDescription);
  const storeBadge = resolveStoreBadge(storeDecoration);
  const storeAvatarText = storeTitle.slice(0, 2).toUpperCase();
  const storeAvatarImage = normalizeText(storeLogo);
  const resolvedTabLabels = DEFAULT_STORE_TAB_LABELS.map((label, index) => normalizeText(tabLabels?.[index]) || label);
  const resolvedFilterLabels = DEFAULT_STORE_FILTER_LABELS.map(
    (label, index) => normalizeText(filterLabels?.[index]) || label
  );
  const resolvedHeroRatingLabels = DEFAULT_STORE_HERO_RATING_LABELS.map(
    (label, index) => normalizeText(heroRatingLabels?.[index]) || label
  );
  const resolvedHeroTagLabels = DEFAULT_STORE_HERO_TAG_LABELS.map(
    (label, index) => normalizeText(heroTagLabels?.[index]) || label
  );
  const heroBackground = storeCover
    ? toBackgroundImage(storeCover, storeTheme || palettes[0])
    : storeTheme || palettes[0];

  const resolveSoldCount = (product: ProductItem, index: number) => {
    const seed = [...product.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) + index * 17;
    return (seed % 500) + 9;
  };

  const resolveDiscountText = (product: ProductItem) => {
    const reduce = Math.max(8, Math.round(product.price * 0.24));
    return `限时立减${reduce}元`;
  };

  return (
    <>
      <section className={styles.storeGoodsHero} style={{ backgroundImage: heroBackground }}>
        <div className={styles.storeGoodsHeroMask} />
        <div className={styles.storeGoodsHeroContent}>
          <div className={styles.storeGoodsProfile}>
            <div className={styles.storeGoodsAvatar}>
              {storeAvatarImage ? (
                <img src={storeAvatarImage} alt={storeTitle} className={styles.storeGoodsAvatarImage} />
              ) : (
                storeAvatarText
              )}
            </div>
            <div className={styles.storeGoodsMeta}>
              <h2>{storeTitle}</h2>
              <p>
                <span className={styles.storeGoodsStars}>{resolvedHeroRatingLabels[0]}</span>
                <span>{resolvedHeroRatingLabels[1]}</span>
                <span>{resolvedHeroRatingLabels[2]}</span>
              </p>
              <p className={styles.storeGoodsMetaLine}>
                <span>{storeSubTitle}</span>
                {storeDescriptionText ? (
                  <span className={styles.storeGoodsMetaDescription}> · {storeDescriptionText}</span>
                ) : null}
              </p>
            </div>
            <button type="button" className={styles.storeGoodsActionBtn} aria-label="联系卖家" title="联系卖家">
              <MessageCircle size={15} />
            </button>
          </div>
          <div className={styles.storeGoodsTags}>
            {resolvedHeroTagLabels.map((label, index) => (
              <span key={`hero-tag-${index}`}>{label}</span>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.storeGoodsTabs}>
        {resolvedTabLabels.map((label, index) => (
          <button
            key={`tab-${index}`}
            className={`${styles.storeGoodsTab} ${index === 0 ? styles.storeGoodsTabActive : ''}`}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.storeGoodsQuickFilters}>
        {resolvedFilterLabels.map((label, index) => (
          <button
            key={`filter-${index}`}
            className={`${styles.storeGoodsQuickFilter} ${index === 0 ? styles.storeGoodsQuickFilterActive : ''}`}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <div className={styles.empty}>
          <p>该店铺暂未上架商品</p>
        </div>
      ) : (
        <div className={styles.storeGoodsGrid}>
          {products.map((product, index) => {
            const favored = isFavorited(product.id);
            const bg = toBackgroundImage(product.img, palettes[index % palettes.length]);
            const soldCount = resolveSoldCount(product, index);
            const isSoldOut = product.isSelected === false || Math.max(0, Math.floor(Number(product.stock) || 0)) === 0;
            const productName = normalizeText(product.name) || product.name;
            const productDesc = normalizeText(product.desc) || product.desc;
            return (
              <div
                key={product.id}
                className={styles.storeGoodsCard}
              >
                <div className={styles.storeGoodsImage} style={{ backgroundImage: bg }}>
                  {isSoldOut ? <div className={styles.storeGoodsSoldOutMask}>该商品已售罄</div> : null}
                  <button
                    className={styles.storeGoodsFavBtn}
                    aria-label="收藏"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(product);
                    }}
                  >
                    <Heart size={15} className={favored ? styles.favOn : styles.favOff} />
                  </button>
                </div>
                <div className={styles.storeGoodsInfo}>
                  <em>{resolveDiscountText(product)}</em>
                  <h3 title={productName}>
                    {storeBadge} {productName}
                  </h3>
                  <p title={productDesc}>{productDesc}</p>
                  <div className={styles.storeGoodsPriceRow}>
                    <strong>{formatMoney(product.price)}</strong>
                    <span>已售 {soldCount}</span>
                  </div>
                  <button
                    className={styles.storeGoodsAddBtn}
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddToCart(product.id);
                    }}
                    disabled={isSoldOut}
                  >
                    <Plus size={14} />
                    加购
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button type="button" className={`${styles.cartBar} ${styles.cartBarEntry}`} onClick={onOpenCart}>
        <div className={styles.cartLeft}>
          <ShoppingCart size={20} />
          <div>
            <div className={styles.cartSub}>购物车 ({cart.length} 件)</div>
            <div className={styles.cartTotal}>总计: {formatMoney(cartTotal)}</div>
          </div>
        </div>
        <div className={styles.cartEntryHint}>
          去购物车
          <ChevronRight size={16} />
        </div>
      </button>
    </>
  );
};
