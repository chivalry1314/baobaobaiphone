import React from 'react';
import { Eye, EyeOff, ImagePlus, Plus, Trash2 } from 'lucide-react';
import type { CommerceStore, StoreKind } from '../../../shared/business/commerce/domain/types';
import type { StoreForm, StoreTypeOption } from '../types';
import styles from '../SellerApp.module.css';

type SellerStoresSectionProps = {
  storePage: 'stores' | 'types' | 'edit';
  editingStoreId: string | null;
  currentTypeSelectValue: string;
  typeOptions: StoreTypeOption[];
  storeForm: StoreForm;
  stores: CommerceStore[];
  newTypeKindInput: string;
  newTypeName: string;
  draggingStoreId: string | null;
  dropTargetStoreId: string | null;
  storeKindLabel: Record<StoreKind, string>;
  repairText: (value?: string) => string;
  resolveTypeCategoryLabel: (item: StoreTypeOption) => string;
  applyType: (typeName: string, kind: StoreKind, categoryLabel?: string) => void;
  setStorePage: React.Dispatch<React.SetStateAction<'stores' | 'types' | 'edit'>>;
  setStoreForm: React.Dispatch<React.SetStateAction<StoreForm>>;
  setNewTypeKindInput: React.Dispatch<React.SetStateAction<string>>;
  setNewTypeName: React.Dispatch<React.SetStateAction<string>>;
  setDraggingStoreId: React.Dispatch<React.SetStateAction<string | null>>;
  setDropTargetStoreId: React.Dispatch<React.SetStateAction<string | null>>;
  onStoreCoverUpload: (file?: File) => Promise<void>;
  onSaveStore: () => Promise<void>;
  onEditStore: (store: CommerceStore) => void;
  onToggleStoreVisible: (id: string) => Promise<void>;
  onRemoveStore: (store: CommerceStore) => Promise<void>;
  onResetStoreForm: (kind: StoreKind) => void;
  onHandleStoreDragStart: (storeId: string) => void;
  onHandleStoreDragOver: (e: React.DragEvent<HTMLDivElement>, targetStoreId: string) => void;
  onHandleStoreDrop: (targetStoreId: string) => Promise<void>;
  onHandleStoreTouchStart: (storeId: string) => void;
  onHandleStoreTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  onHandleStoreTouchEnd: () => Promise<void>;
  onAddStoreType: () => void;
  onUseTypeForStore: (item: StoreTypeOption) => void;
  onRemoveCustomStoreType: (id: string) => void;
};

export const SellerStoresSection: React.FC<SellerStoresSectionProps> = ({
  storePage,
  editingStoreId,
  currentTypeSelectValue,
  typeOptions,
  storeForm,
  stores,
  newTypeKindInput,
  newTypeName,
  draggingStoreId,
  dropTargetStoreId,
  storeKindLabel,
  repairText,
  resolveTypeCategoryLabel,
  applyType,
  setStorePage,
  setStoreForm,
  setNewTypeKindInput,
  setNewTypeName,
  setDraggingStoreId,
  setDropTargetStoreId,
  onStoreCoverUpload,
  onSaveStore,
  onEditStore,
  onToggleStoreVisible,
  onRemoveStore,
  onResetStoreForm,
  onHandleStoreDragStart,
  onHandleStoreDragOver,
  onHandleStoreDrop,
  onHandleStoreTouchStart,
  onHandleStoreTouchMove,
  onHandleStoreTouchEnd,
  onAddStoreType,
  onUseTypeForStore,
  onRemoveCustomStoreType,
}) => {
  return (
    <>
      {storePage === 'stores' && (
        <>
          <section className={styles.card}>
            <h3>店铺新增</h3>

            <div className={styles.field}>
              <label>店铺类型</label>
              <select
                value={currentTypeSelectValue}
                onChange={(e) => {
                  const selected = typeOptions.find((item) => item.id === e.target.value);
                  if (!selected) return;
                  applyType(selected.typeName, selected.kind, resolveTypeCategoryLabel(selected));
                }}
              >
                {typeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {resolveTypeCategoryLabel(item)} / {item.typeName}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.actionRow}>
              <button className={styles.btnGhost} onClick={() => setStorePage('types')}>
                没有合适类型？去店铺类型管理              </button>
            </div>

            <div className={styles.field}>
              <label>店铺招牌</label>
              <input
                value={storeForm.signboard}
                onChange={(e) => setStoreForm((p) => ({ ...p, signboard: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label>店铺文案</label>
              <input
                value={storeForm.slogan}
                onChange={(e) => setStoreForm((p) => ({ ...p, slogan: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label>店铺主题</label>
              <input
                value={storeForm.theme}
                onChange={(e) => setStoreForm((p) => ({ ...p, theme: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label>店铺装饰</label>
              <input
                value={storeForm.decoration}
                onChange={(e) => setStoreForm((p) => ({ ...p, decoration: e.target.value }))}
              />
            </div>

            <div className={styles.actionRow}>
              <label className={styles.btnGhost}>
                <ImagePlus size={14} /> 上传封面
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => void onStoreCoverUpload(e.target.files?.[0])}
                />
              </label>
              <button className={styles.btn} onClick={() => void onSaveStore()}>
                {editingStoreId ? '保存修改' : '新增店铺'}
              </button>
              <button
                className={styles.btnGhost}
                onClick={() => setStoreForm((p) => ({ ...p, visible: !p.visible }))}
              >
                {storeForm.visible ? (
                  <>
                    <EyeOff size={14} /> 设为隐藏
                  </>
                ) : (
                  <>
                    <Eye size={14} /> 设为显示
                  </>
                )}
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <h3>全部店铺</h3>
            <p className={styles.tip}>可按住店铺卡片拖动排序</p>
            <div className={styles.list}>
              {stores.map((store) => (
                <div
                  key={store.id}
                  data-store-id={store.id}
                  className={`${styles.listItem} ${styles.storeListItem}`}
                  draggable
                  onDragStart={() => onHandleStoreDragStart(store.id)}
                  onDragOver={(e) => onHandleStoreDragOver(e, store.id)}
                  onDrop={() => void onHandleStoreDrop(store.id)}
                  onDragEnd={() => {
                    setDraggingStoreId(null);
                    setDropTargetStoreId(null);
                  }}
                  onTouchStart={() => onHandleStoreTouchStart(store.id)}
                  onTouchMove={onHandleStoreTouchMove}
                  onTouchEnd={() => void onHandleStoreTouchEnd()}
                  style={draggingStoreId === store.id ? { opacity: 0.55 } : undefined}
                >
                  {draggingStoreId && dropTargetStoreId === store.id && draggingStoreId !== store.id && (
                    <div className={styles.dropIndicator} />
                  )}
                  <div
                    className={styles.thumb}
                    style={{
                      background: store.cover ? undefined : store.theme,
                      backgroundImage: store.cover ? `url(${store.cover})` : undefined,
                    }}
                  />
                  <div className={`${styles.itemMain} ${styles.storeItemMain}`}>
                    <strong>
                      <span className={styles.badge}>{store.code}</span>
                      {store.signboard || store.name}
                    </strong>
                    <span>{store.slogan}</span>
                    <span>
                      <span className={`${styles.badge} ${!store.visible ? styles.badgeMuted : ''}`}>
                        {store.visible ? '已显示' : '已隐藏'}
                      </span>
                      {store.typeName || store.name} /{' '}
                      {repairText(store.categoryLabel) || storeKindLabel[store.kind]}
                    </span>
                  </div>
                  <div className={`${styles.actionRow} ${styles.storeActions}`}>
                    <button className={styles.btnGhost} onClick={() => onEditStore(store)}>
                      编辑
                    </button>
                    <button className={styles.btnGhost} onClick={() => void onToggleStoreVisible(store.id)}>
                      {store.visible ? '隐藏' : '显示'}
                    </button>
                    <button
                      className={styles.btnDanger}
                      onClick={() => void onRemoveStore(store)}
                      aria-label="删除店铺"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {storePage === 'edit' && (
        <section className={styles.card}>
          <div className={styles.actionRowSplit}>
            <h3>编辑店铺</h3>
            <button className={styles.btnGhost} onClick={() => onResetStoreForm(storeForm.kind)}>
              返回全部店铺
            </button>
          </div>

          <div className={styles.field}>
            <label>店铺类型</label>
            <select
              value={currentTypeSelectValue}
              onChange={(e) => {
                const selected = typeOptions.find((item) => item.id === e.target.value);
                if (!selected) return;
                applyType(selected.typeName, selected.kind, resolveTypeCategoryLabel(selected));
              }}
            >
              {typeOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {resolveTypeCategoryLabel(item)} / {item.typeName}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>店铺招牌</label>
            <input
              value={storeForm.signboard}
              onChange={(e) => setStoreForm((p) => ({ ...p, signboard: e.target.value }))}
            />
          </div>

          <div className={styles.field}>
            <label>店铺文案</label>
            <input
              value={storeForm.slogan}
              onChange={(e) => setStoreForm((p) => ({ ...p, slogan: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label>店铺主题</label>
            <input
              value={storeForm.theme}
              onChange={(e) => setStoreForm((p) => ({ ...p, theme: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label>店铺装饰</label>
            <input
              value={storeForm.decoration}
              onChange={(e) => setStoreForm((p) => ({ ...p, decoration: e.target.value }))}
            />
          </div>

          <div className={styles.actionRow}>
            <label className={styles.btnGhost}>
              <ImagePlus size={14} /> 上传封面
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => void onStoreCoverUpload(e.target.files?.[0])}
              />
            </label>
            <button className={styles.btn} onClick={() => void onSaveStore()}>
              保存修改
            </button>
            <button
              className={styles.btnGhost}
              onClick={() => setStoreForm((p) => ({ ...p, visible: !p.visible }))}
            >
              {storeForm.visible ? (
                <>
                  <EyeOff size={14} /> 设为隐藏
                </>
              ) : (
                <>
                  <Eye size={14} /> 设为显示
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {storePage === 'types' && (
        <>
          <section className={styles.card}>
            <div className={styles.actionRowSplit}>
              <h3>店铺类型管理</h3>
              <button className={styles.btnGhost} onClick={() => setStorePage('stores')}>
                返回店铺新增
              </button>
            </div>
            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label>所属分类</label>
                <input
                  value={newTypeKindInput}
                  onChange={(e) => setNewTypeKindInput(e.target.value)}
                  placeholder="例如：甜品 / 鲜花 / 电影"
                />
              </div>
              <div className={styles.field}>
                <label>类型名称</label>
                <input
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="输入店铺类型"
                />
              </div>
            </div>
            <div className={styles.actionRow}>
              <button className={styles.btn} onClick={onAddStoreType}>
                <Plus size={14} /> 新增店铺类型
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <h3>现有店铺类型</h3>
            <div className={styles.list}>
              {typeOptions.map((item) => (
                <div key={item.id} className={styles.rankRow}>
                  <div className={styles.rankName}>
                    <span className={styles.badge}>{resolveTypeCategoryLabel(item)}</span>
                    <span>{item.typeName}</span>
                  </div>
                  <div className={styles.actionRow}>
                    <button className={styles.btnGhost} onClick={() => onUseTypeForStore(item)}>
                      用于新增店铺
                    </button>
                    {item.custom && (
                      <button
                        className={styles.btnDanger}
                        onClick={() => onRemoveCustomStoreType(item.id)}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
};
