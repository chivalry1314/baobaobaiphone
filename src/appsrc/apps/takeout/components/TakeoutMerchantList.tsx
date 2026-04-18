import React from 'react';
import type { DeliveryMerchant } from '../types';
import type { MerchantListSortKey, TakeoutBizFilter } from '../uiTypes';
import type { TakeoutMerchantFilters } from '../store/types';

interface TakeoutMerchantListProps {
  merchants: DeliveryMerchant[];
  searchKeyword: string;
  bizFilter: TakeoutBizFilter;
  sortKey: MerchantListSortKey;
  merchantFilters: TakeoutMerchantFilters;
  onSearchChange: (keyword: string) => void;
  onBizFilterChange: (filter: TakeoutBizFilter) => void;
  onSortChange: (sortKey: MerchantListSortKey) => void;
  onUpdateFilters: (filters: Partial<TakeoutMerchantFilters>) => void;
  onResetFilters: () => void;
  onOpenMerchant: (merchantId: string) => void;
}

const bizFilters: Array<{ id: TakeoutBizFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'fastfood', label: '快餐' },
  { id: 'drink', label: '饮品' },
  { id: 'snack', label: '小吃' },
  { id: 'dessert', label: '甜品' },
  { id: 'fruit', label: '水果' },
];

const sortOptions: Array<{ id: MerchantListSortKey; label: string }> = [
  { id: 'comprehensive', label: '综合' },
  { id: 'sales', label: '销量' },
  { id: 'distance', label: '距离' },
  { id: 'delivery-fee', label: '配送费' },
];

const deliveryTimeOptions: Array<{ value: number | null; label: string }> = [
  { value: null, label: '不限时长' },
  { value: 25, label: '25分钟内' },
  { value: 30, label: '30分钟内' },
  { value: 40, label: '40分钟内' },
];

const minOrderOptions: Array<{ value: number | null; label: string }> = [
  { value: null, label: '不限起送' },
  { value: 20, label: '20元以内' },
  { value: 30, label: '30元以内' },
  { value: 40, label: '40元以内' },
];

const ratingOptions: Array<{ value: number | null; label: string }> = [
  { value: null, label: '不限评分' },
  { value: 4.5, label: '4.5分以上' },
  { value: 4.7, label: '4.7分以上' },
  { value: 4.8, label: '4.8分以上' },
];

const merchantSummary = (merchant: DeliveryMerchant) => {
  return `⭐ ${merchant.rating.toFixed(1)} · 月售 ${merchant.monthlySales} · 起送 ¥${merchant.minOrderAmount}`;
};

const toSelectValue = (value: number | null): string => {
  return value == null ? '' : String(value);
};

const parseSelectNumber = (value: string): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const TakeoutMerchantList: React.FC<TakeoutMerchantListProps> = ({
  merchants,
  searchKeyword,
  bizFilter,
  sortKey,
  merchantFilters,
  onSearchChange,
  onBizFilterChange,
  onSortChange,
  onUpdateFilters,
  onResetFilters,
  onOpenMerchant,
}) => {
  return (
    <section className="space-y-4 pb-2">
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <label className="text-xs text-gray-500">搜索商家/商品</label>
        <input
          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
          value={searchKeyword}
          placeholder="例如：奶茶 / 鸡排 / 面"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-600">品类筛选</p>
          <button type="button" className="text-xs text-gray-500" onClick={onResetFilters}>
            重置筛选
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {bizFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs ${
                bizFilter === item.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
              onClick={() => onBizFilterChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-600">高级筛选</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-600">
            配送时长
            <select
              className="mt-1 h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs"
              value={toSelectValue(merchantFilters.maxDeliveryMinutes)}
              onChange={(event) =>
                onUpdateFilters({
                  maxDeliveryMinutes: parseSelectNumber(event.target.value),
                })
              }
            >
              {deliveryTimeOptions.map((item) => (
                <option key={String(item.value)} value={item.value == null ? '' : String(item.value)}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-gray-600">
            起送价
            <select
              className="mt-1 h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs"
              value={toSelectValue(merchantFilters.maxMinOrderAmount)}
              onChange={(event) =>
                onUpdateFilters({
                  maxMinOrderAmount: parseSelectNumber(event.target.value),
                })
              }
            >
              {minOrderOptions.map((item) => (
                <option key={String(item.value)} value={item.value == null ? '' : String(item.value)}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-gray-600">
            评分
            <select
              className="mt-1 h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs"
              value={toSelectValue(merchantFilters.minRating)}
              onChange={(event) =>
                onUpdateFilters({
                  minRating: parseSelectNumber(event.target.value),
                })
              }
            >
              {ratingOptions.map((item) => (
                <option key={String(item.value)} value={item.value == null ? '' : String(item.value)}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={merchantFilters.promotionOnly}
              onChange={(event) => onUpdateFilters({ promotionOnly: event.target.checked })}
            />
            仅看有优惠
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-600">排序方式</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {sortOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs ${
                sortKey === item.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
              }`}
              onClick={() => onSortChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {merchants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/65 p-4 text-xs text-gray-500">
            没有匹配的商家，试试调整筛选条件。
          </div>
        ) : (
          merchants.map((merchant) => (
            <button
              key={merchant.id}
              type="button"
              className="w-full rounded-2xl bg-white/90 p-4 text-left shadow-sm"
              onClick={() => onOpenMerchant(merchant.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">{merchant.name}</h4>
                  <p className="mt-1 text-xs text-gray-500">{merchantSummary(merchant)}</p>
                  <p className="mt-2 text-xs text-orange-600">
                    配送费 ¥{merchant.deliveryFee} · 预计 {merchant.avgDeliveryMinutes} 分钟
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{merchant.promotions.join(' · ')}</p>
                </div>
                <span className="rounded-lg bg-gray-900 px-2 py-1 text-xs text-white">{merchant.bizType}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
};
