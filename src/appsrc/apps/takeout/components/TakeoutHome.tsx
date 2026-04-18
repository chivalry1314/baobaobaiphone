import React from 'react';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import type { DeliveryAddress, DeliveryMerchant } from '../types';
import type { TakeoutBizFilter } from '../uiTypes';
import { EmptyState, SkeletonMerchantCard } from './index';

interface TakeoutHomeProps {
  addresses: DeliveryAddress[];
  selectedAddressId: string | null;
  searchKeyword: string;
  cartCount: number;
  recommendedMerchants: DeliveryMerchant[];
  hasMoreRecommendations: boolean;
  isLoading?: boolean;
  onSelectAddress: (addressId: string) => void;
  onSearchChange: (keyword: string) => void;
  onSearchSubmit: () => void;
  onQuickCategory: (filter: TakeoutBizFilter) => void;
  onOpenMerchant: (merchantId: string) => void;
  onOpenCart: () => void;
  onLoadMoreRecommendations: () => void;
}

const quickCategoryEntries: Array<{ filter: TakeoutBizFilter; label: string; icon: string }> = [
  { filter: 'fastfood', label: '快餐简餐', icon: '🍱' },
  { filter: 'drink', label: '奶茶咖啡', icon: '🥤' },
  { filter: 'snack', label: '夜宵小吃', icon: '🍢' },
  { filter: 'dessert', label: '甜品烘焙', icon: '🧁' },
  { filter: 'fruit', label: '鲜果切盒', icon: '🍉' },
];

const merchantSummary = (merchant: DeliveryMerchant): string => {
  return `⭐ ${merchant.rating.toFixed(1)} · 月售 ${merchant.monthlySales} · ${merchant.avgDeliveryMinutes} 分钟送达`;
};

export const TakeoutHome: React.FC<TakeoutHomeProps> = ({
  addresses,
  selectedAddressId,
  searchKeyword,
  cartCount,
  recommendedMerchants,
  hasMoreRecommendations,
  isLoading = false,
  onSelectAddress,
  onSearchChange,
  onSearchSubmit,
  onQuickCategory,
  onOpenMerchant,
  onOpenCart,
  onLoadMoreRecommendations,
}) => {
  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) ||
    addresses.find((address) => address.isDefault) ||
    addresses[0] ||
    null;

  const hasSearchKeyword = searchKeyword.trim().length > 0;
  const isEmptyState = recommendedMerchants.length === 0;

  return (
    <section className="space-y-4 pb-2">
      {/* 地址选择与搜索 */}
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">配送地址</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">
              {selectedAddress?.detail || '请先添加地址'}
            </p>
          </div>
          <select
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
            value={selectedAddress?.id || ''}
            onChange={(event) => onSelectAddress(event.target.value)}
          >
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.detail}
              </option>
            ))}
          </select>
        </div>

        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="relative flex-1">
            <input
              className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-400"
              value={searchKeyword}
              placeholder="搜索商家或商品"
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-xl bg-gray-900 px-3 text-xs font-medium text-white active:bg-gray-800"
          >
            搜索
          </button>
          <button
            type="button"
            className="h-9 rounded-xl bg-orange-500 px-3 text-xs font-medium text-white active:bg-orange-600"
            onClick={onOpenCart}
          >
            购物车 ({cartCount})
          </button>
        </form>
      </div>

      {/* 限时福利 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl bg-gradient-to-r from-orange-100 to-amber-100 p-4"
      >
        <h3 className="text-sm font-semibold text-gray-800">限时福利</h3>
        <p className="mt-1 text-xs text-gray-600">新人专享红包，叠加店铺满减可省更多。</p>
      </motion.div>

      {/* 分类快捷入口 */}
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">分类快捷入口</h3>
          <p className="text-xs text-gray-500">点击直达商家列表</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {quickCategoryEntries.map((entry, index) => (
            <motion.button
              key={entry.filter}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="rounded-xl bg-gray-50 p-3 text-left active:bg-gray-100"
              onClick={() => onQuickCategory(entry.filter)}
            >
              <p className="text-lg">{entry.icon}</p>
              <p className="mt-1 text-xs font-medium text-gray-700">{entry.label}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 推荐商家 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">推荐商家</h3>
          <span className="text-xs text-gray-500">附近热销实时更新</span>
        </div>

        {isLoading ? (
          // 骨架屏加载状态
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonMerchantCard key={i} />
            ))}
          </div>
        ) : isEmptyState ? (
          // 空状态
          hasSearchKeyword ? (
            <EmptyState
              icon="🔍"
              title="没找到相关商家"
              description={`"${searchKeyword}" 暂时没有匹配结果，试试其他关键词吧`}
              actionLabel="清除搜索"
              onAction={() => onSearchChange('')}
            />
          ) : (
            <EmptyState
              icon="🏪"
              title="附近没有商家"
              description="换个地址试试，或者稍后再来看看"
              actionLabel="查看全部分类"
              onAction={() => onQuickCategory('all')}
            />
          )
        ) : (
          // 商家列表
          recommendedMerchants.map((merchant, index) => (
            <motion.button
              key={merchant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="w-full rounded-2xl bg-white/90 p-4 text-left shadow-sm active:scale-98"
              onClick={() => onOpenMerchant(merchant.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-800">{merchant.name}</h4>
                  <p className="mt-1 text-xs text-gray-500">{merchantSummary(merchant)}</p>
                  <p className="mt-2 text-xs text-orange-600">
                    {merchant.promotions[0] || '多重优惠叠加中'}
                  </p>
                </div>
                <span className="rounded-lg bg-gray-900 px-2 py-1 text-xs text-white">
                  {merchant.distanceKm.toFixed(1)}km
                </span>
              </div>
            </motion.button>
          ))
        )}

        {!isLoading && hasMoreRecommendations && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            className="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 text-xs font-medium text-gray-700 active:bg-gray-50"
            onClick={onLoadMoreRecommendations}
          >
            加载更多推荐
          </motion.button>
        )}

        {!isLoading && !hasMoreRecommendations && recommendedMerchants.length > 0 && (
          <p className="text-center text-xs text-gray-400">已加载全部推荐商家</p>
        )}
      </div>
    </section>
  );
};
