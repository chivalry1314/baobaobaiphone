import React, { useMemo, useState } from 'react';
import { useDeliverySellerStore } from '../store/store';
import { formatPriceInt, formatProductStatus } from '../utils/formatters';
import { useToast, ConfirmDialog } from './ui';
import type { ProductListProps } from './index';

export const ProductList: React.FC<ProductListProps> = ({ onEdit, onAdd }) => {
  const {
    products,
    categories,
    productFilter,
    productSearchKeyword,
    setProductFilter,
    setProductSearchKeyword,
    toggleProductStatus,
    deleteProduct,
    batchToggleProductStatus,
    updateProductStock,
  } = useDeliverySellerStore();

  const { success, error, warning, ToastComponent } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingStockProduct, setEditingStockProduct] = useState<{ id: string; stock: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ visible: boolean; productId: string; productName: string } | null>(null);

  // 过滤商品
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 状态过滤
      if (productFilter !== 'all') {
        if (productFilter === 'on' && product.status !== 'on') return false;
        if (productFilter === 'off' && product.status !== 'off') return false;
        if (productFilter === 'lowStock' && (product.stock >= 10 || product.stock === 0)) return false;
        if (productFilter === 'outOfStock' && product.stock !== 0) return false;
      }

      // 搜索过滤
      if (productSearchKeyword) {
        const keyword = productSearchKeyword.toLowerCase();
        return (
          product.name.toLowerCase().includes(keyword) ||
          product.desc.toLowerCase().includes(keyword)
        );
      }

      return true;
    });
  }, [products, productFilter, productSearchKeyword]);

  // 按分类分组
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, typeof products> = {};
    filteredProducts.forEach((product) => {
      const categoryId = product.categoryId;
      if (!grouped[categoryId]) {
        grouped[categoryId] = [];
      }
      grouped[categoryId].push(product);
    });
    return grouped;
  }, [filteredProducts]);

  // 批量操作
  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleBatchToggleStatus = (status: 'on' | 'off') => {
    if (selectedProducts.size === 0) {
      warning('请先选择商品');
      return;
    }
    batchToggleProductStatus(Array.from(selectedProducts), status);
    success(`已${status === 'on' ? '上架' : '下架'} ${selectedProducts.size} 个商品`);
    setSelectedProducts(new Set());
  };

  const handleQuickAdjustStock = (productId: string, currentStock: number) => {
    setEditingStockProduct({ id: productId, stock: currentStock });
    setShowStockModal(true);
  };

  const handleSaveStock = () => {
    if (editingStockProduct) {
      updateProductStock(editingStockProduct.id, editingStockProduct.stock);
      success('库存已更新');
      setShowStockModal(false);
      setEditingStockProduct(null);
    }
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    setConfirmDelete({ visible: true, productId, productName });
  };

  const confirmDeleteProduct = () => {
    if (confirmDelete) {
      deleteProduct(confirmDelete.productId);
      success(`已删除商品"${confirmDelete.productName}"`);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="product-list">
      <div className="list-header">
        <h2 className="page-title">商品管理</h2>
        <button className="btn btn-primary" onClick={onAdd}>
          + 新增商品
        </button>
      </div>

      {/* 批量操作栏 */}
      {selectedProducts.size > 0 && (
        <div className="batch-action-bar">
          <span className="selected-count">已选择 {selectedProducts.size} 个商品</span>
          <div className="batch-actions">
            <button
              className="btn btn-success"
              onClick={() => handleBatchToggleStatus('on')}
            >
              批量上架
            </button>
            <button
              className="btn btn-warning"
              onClick={() => handleBatchToggleStatus('off')}
            >
              批量下架
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setSelectedProducts(new Set())}
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索商品名称或描述..."
          value={productSearchKeyword}
          onChange={(e) => setProductSearchKeyword(e.target.value)}
        />
        <select
          className="filter-select"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value as any)}
        >
          <option value="all">全部</option>
          <option value="on">上架中</option>
          <option value="off">已下架</option>
          <option value="lowStock">库存紧张</option>
          <option value="outOfStock">已售罄</option>
        </select>
        <button
          className="btn btn-secondary"
          onClick={handleSelectAll}
          title={selectedProducts.size === filteredProducts.length ? '取消全选' : '全选'}
        >
          {selectedProducts.size === filteredProducts.length ? '取消全选' : '全选'}
        </button>
      </div>

      {/* 商品列表 */}
      {Object.keys(productsByCategory).length === 0 ? (
        <div className="empty-state">
          <p>暂无商品</p>
          <button className="btn btn-primary" onClick={onAdd}>
            添加第一个商品
          </button>
        </div>
      ) : (
        Object.entries(productsByCategory).map(([categoryId, categoryProducts]) => {
          const category = categories.find((c) => c.id === categoryId);
          return (
            <div key={categoryId} className="category-section">
              <h3 className="category-title">{category?.name || '未分类'}</h3>
              <div className="product-items">
                {categoryProducts.map((product) => (
                  <div key={product.id} className={`product-item ${selectedProducts.has(product.id) ? 'selected' : ''}`}>
                    <div className="product-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                      />
                    </div>
                    <div className="product-info">
                      <div className="product-name">{product.name}</div>
                      <div className="product-desc">{product.desc}</div>
                      <div className="product-meta">
                        <span className="product-price">{formatPriceInt(product.price)}</span>
                        <span className={`product-stock ${product.stock < 10 ? 'low' : ''}`}>
                          库存：{product.stock}
                          {product.stock < 10 && product.stock > 0 && (
                            <button
                              className="btn-tiny"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAdjustStock(product.id, product.stock);
                              }}
                            >
                              调整
                            </button>
                          )}
                        </span>
                        <span className="product-sales">
                          月售：{product.monthlySales}
                        </span>
                      </div>
                    </div>
                    <div className="product-actions">
                      <span className={`status-badge ${product.status === 'on' ? 'on' : 'off'}`}>
                        {formatProductStatus(product.status)}
                      </span>
                      <button
                        className="btn-icon"
                        onClick={() => toggleProductStatus(product.id)}
                        title={product.status === 'on' ? '下架' : '上架'}
                      >
                        {product.status === 'on' ? '🔽' : '🔼'}
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => onEdit?.(product.id)}
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon delete"
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* 库存调整弹窗 */}
      {showStockModal && editingStockProduct && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">调整库存</h3>
            <div className="modal-body">
              <input
                type="number"
                className="form-input"
                value={editingStockProduct.stock}
                onChange={(e) => setEditingStockProduct({
                  ...editingStockProduct,
                  stock: Number(e.target.value),
                })}
                min="0"
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowStockModal(false);
                  setEditingStockProduct(null);
                }}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveStock}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        visible={confirmDelete?.visible || false}
        title="确认删除"
        message={`确定要删除"${confirmDelete?.productName}"吗？此操作不可恢复。`}
        confirmText="删除"
        confirmType="danger"
        onConfirm={confirmDeleteProduct}
        onCancel={() => setConfirmDelete(null)}
      />

      <ToastComponent />
    </div>
  );
};
