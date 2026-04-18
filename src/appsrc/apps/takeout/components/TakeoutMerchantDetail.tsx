import React from 'react';
import type {
  DeliveryCartLineSelectedOption,
  DeliveryDish,
  DeliveryDishCategory,
  DeliveryMerchant,
} from '../types';
import { formatMoney } from '../utils';

interface TakeoutMerchantDetailProps {
  merchant: DeliveryMerchant;
  categories: DeliveryDishCategory[];
  dishes: DeliveryDish[];
  merchantCartCount: number;
  merchantCartAmount: number;
  onAddDish: (dishId: string, selectedOptions?: DeliveryCartLineSelectedOption[]) => void;
  onOpenCart: () => void;
}

const resolveHeroBackground = (merchant: DeliveryMerchant): string => {
  if (merchant.cover && merchant.cover.trim()) return merchant.cover;

  if (merchant.bizType === 'drink') {
    return 'linear-gradient(135deg, #60a5fa 0%, #14b8a6 100%)';
  }
  if (merchant.bizType === 'dessert') {
    return 'linear-gradient(135deg, #f9a8d4 0%, #f97316 100%)';
  }
  if (merchant.bizType === 'snack') {
    return 'linear-gradient(135deg, #fb7185 0%, #f59e0b 100%)';
  }
  if (merchant.bizType === 'fruit') {
    return 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
  }
  return 'linear-gradient(135deg, #fb7185 0%, #f59e0b 100%)';
};

const hasRequiredSkuMissing = (dish: DeliveryDish, selectedOptionBySku: Record<string, string>) => {
  return dish.skus.some((item) => item.required && !selectedOptionBySku[item.id]);
};

const resolveDishCategoryLabel = (categories: DeliveryDishCategory[], categoryId: string): string => {
  const found = categories.find((item) => item.id === categoryId);
  return found?.name || '商品';
};

const resolveOptionPrice = (dish: DeliveryDish, selectedOptionBySku: Record<string, string>): number => {
  return dish.skus.reduce((sum, sku) => {
    const selectedOptionId = selectedOptionBySku[sku.id];
    if (!selectedOptionId) return sum;

    const selectedOption = sku.options.find((item) => item.id === selectedOptionId);
    if (!selectedOption) return sum;

    return sum + selectedOption.priceDelta;
  }, 0);
};

export const TakeoutMerchantDetail: React.FC<TakeoutMerchantDetailProps> = ({
  merchant,
  categories,
  dishes,
  merchantCartCount,
  merchantCartAmount,
  onAddDish,
  onOpenCart,
}) => {
  const [activeCategoryId, setActiveCategoryId] = React.useState<string>(categories[0]?.id || '');
  const [specDish, setSpecDish] = React.useState<DeliveryDish | null>(null);
  const [selectedOptionBySku, setSelectedOptionBySku] = React.useState<Record<string, string>>({});
  const [specError, setSpecError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (categories.length === 0) {
      setActiveCategoryId('');
      return;
    }
    if (categories.some((item) => item.id === activeCategoryId)) return;
    setActiveCategoryId(categories[0]?.id || '');
  }, [activeCategoryId, categories]);

  const visibleDishes = React.useMemo(() => {
    if (!activeCategoryId) return dishes;
    const filtered = dishes.filter((dish) => dish.categoryId === activeCategoryId);
    if (filtered.length > 0) return filtered;
    return dishes;
  }, [activeCategoryId, dishes]);

  const openSpecModal = (dish: DeliveryDish) => {
    setSpecDish(dish);
    const defaults: Record<string, string> = {};
    dish.skus.forEach((sku) => {
      if (!sku.required) return;
      const firstOption = sku.options[0];
      if (!firstOption) return;
      defaults[sku.id] = firstOption.id;
    });
    setSelectedOptionBySku(defaults);
    setSpecError(null);
  };

  const closeSpecModal = () => {
    setSpecDish(null);
    setSelectedOptionBySku({});
    setSpecError(null);
  };

  const handleConfirmSpec = () => {
    if (!specDish) return;
    if (hasRequiredSkuMissing(specDish, selectedOptionBySku)) {
      setSpecError('请先选择完整规格。');
      return;
    }

    const options: DeliveryCartLineSelectedOption[] = specDish.skus
      .map((sku) => {
        const selectedOptionId = selectedOptionBySku[sku.id];
        if (!selectedOptionId) return null;
        const selectedOption = sku.options.find((item) => item.id === selectedOptionId);
        if (!selectedOption) return null;

        return {
          skuId: sku.id,
          optionId: selectedOption.id,
          optionName: selectedOption.name,
          priceDelta: selectedOption.priceDelta,
        };
      })
      .filter((item): item is DeliveryCartLineSelectedOption => Boolean(item));

    onAddDish(specDish.id, options);
    closeSpecModal();
  };

  return (
    <section className="space-y-4 pb-2">
      <div className="overflow-hidden rounded-2xl text-white shadow-sm" style={{ background: resolveHeroBackground(merchant) }}>
        <div className="bg-black/20 p-4">
          <h3 className="text-lg font-semibold">{merchant.name}</h3>
          <p className="mt-1 text-xs text-white/90">⭐ {merchant.rating.toFixed(1)} · 月售 {merchant.monthlySales}</p>
          <p className="mt-2 text-xs text-white/95">公告：{merchant.announcement}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {merchant.promotions.map((item) => (
              <span key={item} className="rounded-full bg-white/25 px-2 py-1 text-[11px]">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/95">{merchant.notice}</p>
        </div>
      </div>

      <div className="grid grid-cols-[84px_1fr] gap-3">
        <aside className="space-y-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`w-full rounded-xl px-2 py-2 text-xs ${
                activeCategoryId === category.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/90 text-gray-700'
              }`}
              onClick={() => setActiveCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </aside>

        <div className="space-y-3">
          {visibleDishes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/65 p-4 text-xs text-gray-500">
              该分类下暂无商品。
            </div>
          ) : (
            visibleDishes.map((dish) => (
              <article key={dish.id} className="rounded-2xl bg-white/90 p-4 shadow-sm">
                <p className="text-[11px] text-gray-500">{resolveDishCategoryLabel(categories, dish.categoryId)}</p>
                <h4 className="mt-1 text-sm font-semibold text-gray-800">{dish.name}</h4>
                <p className="mt-1 text-xs text-gray-500">{dish.desc}</p>
                <p className="mt-1 text-xs text-gray-500">月售 {dish.monthlySales}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-600">{formatMoney(dish.price)}</p>
                    {dish.originalPrice ? (
                      <p className="text-xs text-gray-400 line-through">{formatMoney(dish.originalPrice)}</p>
                    ) : null}
                  </div>

                  {dish.skus.length > 0 ? (
                    <button
                      type="button"
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
                      onClick={() => openSpecModal(dish)}
                    >
                      选规格
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
                      onClick={() => onAddDish(dish.id)}
                    >
                      加购
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <button
        type="button"
        className="sticky bottom-2 flex w-full items-center justify-between rounded-2xl bg-gray-900 px-4 py-3 text-white"
        onClick={onOpenCart}
      >
        <span className="text-sm">购物车（{merchantCartCount}）</span>
        <span className="text-sm">{formatMoney(merchantCartAmount)} 去结算</span>
      </button>

      {specDish ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/35 p-3" onClick={closeSpecModal}>
          <div
            className="max-h-[80vh] w-full max-w-[480px] overflow-y-auto rounded-2xl bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-800">{specDish.name}</h3>
            <p className="mt-1 text-xs text-gray-500">{specDish.desc}</p>

            <div className="mt-3 space-y-4">
              {specDish.skus.map((sku) => (
                <div key={sku.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-gray-700">{sku.name}</p>
                    {sku.required ? <span className="text-[11px] text-orange-600">必选</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sku.options.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`rounded-lg px-3 py-1.5 text-xs ${
                          selectedOptionBySku[sku.id] === item.id
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                        onClick={() =>
                          setSelectedOptionBySku((prev) => ({
                            ...prev,
                            [sku.id]: item.id,
                          }))
                        }
                      >
                        {item.name}
                        {item.priceDelta > 0 ? ` +${formatMoney(item.priceDelta)}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {specError ? <p className="mt-3 text-xs text-red-500">{specError}</p> : null}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-800">
                到手价 {formatMoney(specDish.price + resolveOptionPrice(specDish, selectedOptionBySku))}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700"
                  onClick={closeSpecModal}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-white"
                  onClick={handleConfirmSpec}
                >
                  加入购物车
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
