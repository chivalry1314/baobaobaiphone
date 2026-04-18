import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Clock, MapPin, Ticket } from 'lucide-react';
import type { DeliveryAddress, DeliveryCartLine, DeliveryCoupon } from '../types';
import { formatMoney } from '../utils';
import { EmptyState } from './index';

export interface TakeoutCartMerchantGroup {
  merchantId: string;
  merchantName: string;
  deliveryFee: number;
  minOrderAmount: number;
  itemTotal: number;
  packageFee: number;
  lines: DeliveryCartLine[];
}

export interface TakeoutCartFeeSummary {
  itemTotal: number;
  packageFee: number;
  deliveryFee: number;
  discountFee: number;
  payableAmount: number;
}

interface TakeoutCartProps {
  groups: TakeoutCartMerchantGroup[];
  addresses: DeliveryAddress[];
  selectedAddressId: string | null;
  deliveryTimeMode: 'instant' | 'schedule';
  scheduleDate: string;
  scheduleTime: string;
  coupons: DeliveryCoupon[];
  selectedCouponId: string | null;
  feeSummary: TakeoutCartFeeSummary;
  isLoading?: boolean;
  onIncrease: (lineId: string) => void;
  onDecrease: (lineId: string) => void;
  onRemove: (lineId: string) => void;
  onClearMerchant: (merchantId: string) => void;
  onSelectAddress: (addressId: string) => void;
  onChangeDeliveryMode: (mode: 'instant' | 'schedule') => void;
  onChangeScheduleDate: (value: string) => void;
  onChangeScheduleTime: (value: string) => void;
  onSelectCoupon: (couponId: string | null) => void;
  onPlaceOrder: () => void;
  onGoShopping?: () => void;
}

const availableCoupons = (coupons: DeliveryCoupon[]): DeliveryCoupon[] => {
  const now = Date.now();
  return coupons.filter((coupon) => !coupon.used && coupon.expiresAt > now);
};

export const TakeoutCart: React.FC<TakeoutCartProps> = ({
  groups,
  addresses,
  selectedAddressId,
  deliveryTimeMode,
  scheduleDate,
  scheduleTime,
  coupons,
  selectedCouponId,
  feeSummary,
  isLoading = false,
  onIncrease,
  onDecrease,
  onRemove,
  onClearMerchant,
  onSelectAddress,
  onChangeDeliveryMode,
  onChangeScheduleDate,
  onChangeScheduleTime,
  onSelectCoupon,
  onPlaceOrder,
  onGoShopping,
}) => {
  const selectableCoupons = availableCoupons(coupons);
  const isEmpty = groups.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        icon="🛒"
        title="购物车空空如也"
        description="快去挑选喜欢的美食吧"
        actionLabel="去逛逛"
        onAction={onGoShopping}
      />
    );
  }

  return (
    <section className="space-y-4 pb-2">
      {/* 配送地址 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white/90 p-4 shadow-sm"
      >
        <div className="mb-2 flex items-center gap-2">
          <MapPin size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">配送地址</h3>
        </div>
        <select
          className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
          value={selectedAddressId || ''}
          onChange={(event) => onSelectAddress(event.target.value)}
        >
          {addresses.map((address) => (
            <option key={address.id} value={address.id}>
              {address.detail}
            </option>
          ))}
        </select>
      </motion.div>

      {/* 配送方式 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl bg-white/90 p-4 shadow-sm"
      >
        <div className="mb-2 flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">配送时间</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              deliveryTimeMode === 'instant'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => onChangeDeliveryMode('instant')}
          >
            立即送达
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              deliveryTimeMode === 'schedule'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => onChangeDeliveryMode('schedule')}
          >
            预约送达
          </button>
        </div>

        {deliveryTimeMode === 'schedule' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 grid grid-cols-2 gap-2"
          >
            <label className="text-xs text-gray-600">
              日期
              <input
                className="mt-1 h-8 w-full rounded-lg border border-gray-200 px-2 text-sm outline-none focus:border-orange-400"
                type="date"
                value={scheduleDate}
                onChange={(event) => onChangeScheduleDate(event.target.value)}
              />
            </label>
            <label className="text-xs text-gray-600">
              时间
              <input
                className="mt-1 h-8 w-full rounded-lg border border-gray-200 px-2 text-sm outline-none focus:border-orange-400"
                type="time"
                value={scheduleTime}
                onChange={(event) => onChangeScheduleTime(event.target.value)}
              />
            </label>
          </motion.div>
        )}
      </motion.div>

      {/* 优惠券 */}
      {selectableCoupons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-white/90 p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2">
            <Ticket size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-800">优惠券</h3>
          </div>
          <select
            className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
            value={selectedCouponId || ''}
            onChange={(event) => onSelectCoupon(event.target.value || null)}
          >
            <option value="">不使用优惠券</option>
            {selectableCoupons.map((coupon) => (
              <option key={coupon.id} value={coupon.id}>
                {coupon.title}（满{coupon.thresholdAmount}减{coupon.discountAmount}）
              </option>
            ))}
          </select>
        </motion.div>
      )}

      {/* 商品列表 */}
      <div className="space-y-3">
        {groups.map((group, groupIndex) => (
          <motion.article
            key={group.merchantId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + groupIndex * 0.05 }}
            className="rounded-2xl bg-white/90 p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{group.merchantName}</h3>
                <p className="text-xs text-gray-500">
                  起送 {formatMoney(group.minOrderAmount)} · 配送费 {formatMoney(group.deliveryFee)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                onClick={() => onClearMerchant(group.merchantId)}
              >
                清空店铺
              </button>
            </div>

            <div className="space-y-2">
              {group.lines.map((line, lineIndex) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + groupIndex * 0.05 + lineIndex * 0.03 }}
                  className="rounded-xl bg-gray-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-800">{line.dishName}</h4>
                      <p className="mt-1 text-xs text-gray-500">
                        {line.selectedOptions.length > 0
                          ? line.selectedOptions.map((item) => item.optionName).join(' / ')
                          : '默认规格'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-orange-600">
                      {formatMoney(line.unitPrice * line.qty)}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm font-medium text-gray-700 shadow-sm active:scale-90"
                        onClick={() => onDecrease(line.id)}
                      >
                        -
                      </button>
                      <span className="min-w-6 text-center text-sm font-medium">{line.qty}</span>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-sm font-medium text-white shadow-sm active:scale-90"
                        onClick={() => onIncrease(line.id)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                      onClick={() => onRemove(line.id)}
                    >
                      删除
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.article>
        ))}
      </div>

      {/* 费用明细 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-white/90 p-4 shadow-sm"
      >
        <h3 className="text-sm font-semibold text-gray-800">费用明细</h3>
        <div className="mt-3 space-y-2 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span>商品金额</span>
            <span>{formatMoney(feeSummary.itemTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>打包费</span>
            <span>{formatMoney(feeSummary.packageFee)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>配送费</span>
            <span>{formatMoney(feeSummary.deliveryFee)}</span>
          </div>
          {feeSummary.discountFee > 0 && (
            <div className="flex items-center justify-between text-green-600">
              <span>优惠抵扣</span>
              <span>-{formatMoney(feeSummary.discountFee)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-sm font-semibold text-gray-900">
            <span>待支付</span>
            <span className="text-orange-600">{formatMoney(feeSummary.payableAmount)}</span>
          </div>
        </div>
      </motion.div>

      {/* 提交订单按钮 */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        className="sticky bottom-2 flex w-full items-center justify-between rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-lg active:bg-gray-800"
        onClick={onPlaceOrder}
        disabled={isLoading}
      >
        <span className="text-sm font-medium">提交订单</span>
        <span className="text-base font-bold">{formatMoney(feeSummary.payableAmount)}</span>
      </motion.button>
    </section>
  );
};
