import React from 'react';
import { ImagePlus, Plus } from 'lucide-react';
import { formatMoney } from '../../../shared/business/commerce/domain/utils';
import type { CommerceStore, ProductItem, StoreKind } from '../../../shared/business/commerce/domain/types';
import type { ProductForm, ProductKind } from '../types';
import styles from '../SellerApp.module.css';

type SellerProductsSectionProps = {
  productPage: 'create' | 'edit';
  selectedStoreId: string;
  productStores: CommerceStore[];
  productForm: ProductForm;
  productsInStore: ProductItem[];
  selectedKind: ProductKind;
  storeKindLabel: Record<StoreKind, string>;
  onOpenProductCreate: () => void;
  onSelectedStoreChange: (value: string) => void;
  onProductFormChange: React.Dispatch<React.SetStateAction<ProductForm>>;
  onProductImageUpload: (file?: File) => Promise<void>;
  onSaveProduct: () => Promise<void>;
  onEditProduct: (item: ProductItem, kind: ProductKind) => void;
  onRemoveProduct: (id: string) => Promise<void>;
};

export const SellerProductsSection: React.FC<SellerProductsSectionProps> = ({
  productPage,
  selectedStoreId,
  productStores,
  productForm,
  productsInStore,
  selectedKind,
  storeKindLabel,
  onOpenProductCreate,
  onSelectedStoreChange,
  onProductFormChange,
  onProductImageUpload,
  onSaveProduct,
  onEditProduct,
  onRemoveProduct,
}) => {
  return (
    <>
      <section className={styles.card}>
        <div className={styles.actionRowSplit}>
          <h3>{productPage === 'edit' ? '编辑商品' : '新增商品'}</h3>
          {productPage === 'edit' && (
            <button className={styles.btnGhost} onClick={onOpenProductCreate}>
              返回新增商品
            </button>
          )}
        </div>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>店铺</label>
            <select
              value={selectedStoreId}
              onChange={(e) => onSelectedStoreChange(e.target.value)}
              disabled={productStores.length === 0}
            >
              {productStores.length === 0 ? (
                <option value="">暂无可用店铺</option>
              ) : (
                productStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {storeKindLabel[store.kind]} · {store.code} · {store.signboard || store.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className={styles.formGrid2}>
            <div className={styles.field}>
              <label>商品名称</label>
              <input
                value={productForm.name}
                onChange={(e) => onProductFormChange((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label>价格</label>
              <input
                value={productForm.price}
                onChange={(e) => onProductFormChange((p) => ({ ...p, price: e.target.value }))}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label>商品描述</label>
            <textarea
              value={productForm.desc}
              onChange={(e) => onProductFormChange((p) => ({ ...p, desc: e.target.value }))}
            />
          </div>
          <div className={styles.actionRow}>
            <label className={styles.btnGhost}>
              <ImagePlus size={14} /> 上传图片
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => void onProductImageUpload(e.target.files?.[0])}
              />
            </label>
            <button className={styles.btn} onClick={() => void onSaveProduct()}>
              <Plus size={14} /> {productPage === 'edit' ? '保存商品' : '新增商品'}
            </button>
            {productPage === 'edit' && (
              <button className={styles.btnGhost} onClick={onOpenProductCreate}>
                取消编辑
              </button>
            )}
          </div>
        </div>
      </section>

      {productPage === 'create' && (
        <section className={styles.card}>
          <h3>店铺商品列表</h3>
          <p className={styles.tip}>当前店铺 {productsInStore.length} 件商品</p>
          <div className={styles.list}>
            {productsInStore.map((item) => (
              <div key={item.id} className={styles.listItem}>
                <div
                  className={styles.thumb}
                  style={{ backgroundImage: item.img ? `url(${item.img})` : undefined }}
                />
                <div className={styles.itemMain}>
                  <strong>{item.name}</strong>
                  <span>{item.desc}</span>
                  <span>{formatMoney(item.price)}</span>
                </div>
                <div className={styles.actionRow}>
                  <button className={styles.btnGhost} onClick={() => onEditProduct(item, selectedKind)}>
                    编辑
                  </button>
                  <button className={styles.btnDanger} onClick={() => void onRemoveProduct(item.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
};
