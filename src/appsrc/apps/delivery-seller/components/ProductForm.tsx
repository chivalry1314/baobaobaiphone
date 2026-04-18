import React, { useState, useEffect } from 'react';
import { useDeliverySellerStore } from '../store/store';
import type { ProductFormProps, ProductFormData } from './index';
import type { DeliveryDish, DeliveryDishSku, DeliveryDishOption } from '../types';

export const ProductForm: React.FC<ProductFormProps> = ({ productId, onSave, onCancel }) => {
  const { products, categories, addProduct, updateProduct } = useDeliverySellerStore();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    desc: '',
    price: 0,
    originalPrice: undefined,
    categoryId: categories[0]?.id || '',
    stock: 99,
    image: '',
    skus: [],
    status: 'on',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 编辑模式：加载现有商品数据
  useEffect(() => {
    if (productId) {
      const existing = products.find((p) => p.id === productId);
      if (existing) {
        setFormData({
          name: existing.name,
          desc: existing.desc,
          price: existing.price,
          originalPrice: existing.originalPrice,
          categoryId: existing.categoryId,
          stock: existing.stock,
          image: existing.image || '',
          skus: existing.skus || [],
          status: existing.status,
        });
      }
    }
  }, [productId, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (productId) {
        // 更新现有商品
        updateProduct(productId, {
          ...formData,
          id: productId,
          merchantId: 'merchant-demo',
          monthlySales: products.find((p) => p.id === productId)?.monthlySales || 0,
        });
      } else {
        // 新增商品
        const newProduct: DeliveryDish = {
          id: `product-${Date.now()}`,
          merchantId: 'merchant-demo',
          ...formData,
          monthlySales: 0,
        };
        addProduct(newProduct);
      }

      onSave?.();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="product-form">
      <h2 className="page-title">{productId ? '编辑商品' : '新增商品'}</h2>

      <form onSubmit={handleSubmit}>
        {/* 基本信息 */}
        <section className="section">
          <h3 className="section-title">基本信息</h3>
          
          <div className="form-group">
            <label className="form-label">商品名称 *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="请输入商品名称"
            />
          </div>

          <div className="form-group">
            <label className="form-label">商品描述</label>
            <textarea
              className="form-textarea"
              value={formData.desc}
              onChange={(e) => handleChange('desc', e.target.value)}
              rows={3}
              placeholder="请输入商品描述"
            />
          </div>

          <div className="form-group">
            <label className="form-label">商品分类 *</label>
            <select
              className="form-select"
              value={formData.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">商品图片 URL</label>
            <input
              type="url"
              className="form-input"
              value={formData.image}
              onChange={(e) => handleChange('image', e.target.value)}
              placeholder="https://example.com/image.png"
            />
          </div>
        </section>

        {/* 价格库存 */}
        <section className="section">
          <h3 className="section-title">价格与库存</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">售价 *</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  className="form-input"
                  value={formData.price}
                  onChange={(e) => handleChange('price', Number(e.target.value))}
                  required
                  min="0"
                  step="0.1"
                />
                <span className="unit">元</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">原价</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  className="form-input"
                  value={formData.originalPrice || ''}
                  onChange={(e) => handleChange('originalPrice', e.target.value ? Number(e.target.value) : undefined)}
                  min="0"
                  step="0.1"
                  placeholder="可选"
                />
                <span className="unit">元</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">库存数量 *</label>
            <input
              type="number"
              className="form-input"
              value={formData.stock}
              onChange={(e) => handleChange('stock', Number(e.target.value))}
              required
              min="0"
            />
          </div>
        </section>

        {/* 商品规格 */}
        <section className="section">
          <h3 className="section-title">商品规格</h3>
          <div className="specs-list">
            {formData.skus.map((sku, index) => (
              <div key={sku.id || index} className="spec-item">
                <div className="spec-header">
                  <span className="spec-name">{sku.name}</span>
                  <span className="spec-required">{sku.required ? '必选' : '可选'}</span>
                </div>
                <div className="spec-options">
                  {sku.options.map((opt) => (
                    <span key={opt.id} className="spec-option">
                      {opt.name}
                      {opt.priceDelta !== 0 && ` (+¥${opt.priceDelta})`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {formData.skus.length === 0 && (
              <p className="empty-hint">暂无规格，可在后续添加</p>
            )}
          </div>
          <p className="form-hint">规格功能待完善，目前仅展示</p>
        </section>

        {/* 上架状态 */}
        <section className="section">
          <h3 className="section-title">上架状态</h3>
          <div className="radio-group">
            <label className="radio-item">
              <input
                type="radio"
                name="status"
                value="on"
                checked={formData.status === 'on'}
                onChange={() => handleChange('status', 'on')}
              />
              <span>立即上架</span>
            </label>
            <label className="radio-item">
              <input
                type="radio"
                name="status"
                value="off"
                checked={formData.status === 'off'}
                onChange={() => handleChange('status', 'off')}
              />
              <span>放入仓库</span>
            </label>
          </div>
        </section>

        {/* 提交按钮 */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
};
