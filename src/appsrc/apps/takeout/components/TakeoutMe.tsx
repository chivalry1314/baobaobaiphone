import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Ticket, Headphones, Settings, FileText, Shield, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import type { DeliveryAddress, DeliveryCoupon, DeliveryUserProfile } from '../types';

interface TakeoutMeProps {
  profile: DeliveryUserProfile;
  addresses: DeliveryAddress[];
  coupons: DeliveryCoupon[];
  onOpenAddresses: () => void;
  onOpenCoupons: () => void;
  onAddAddress?: () => void;
  onEditAddress?: (address: DeliveryAddress) => void;
  onDeleteAddress?: (address: DeliveryAddress) => void;
  onContactSupport?: () => void;
  onOpenSettings?: () => void;
  onOpenInvoice?: () => void;
  onOpenPrivacy?: () => void;
}

const membershipConfig: Record<DeliveryUserProfile['membershipLevel'], { label: string; color: string; bg: string }> = {
  normal: { label: '普通会员', color: 'text-gray-600', bg: 'bg-gray-100' },
  silver: { label: '银卡会员', color: 'text-gray-400', bg: 'bg-gray-200' },
  gold: { label: '金卡会员', color: 'text-yellow-600', bg: 'bg-yellow-100' },
};

const countAvailableCoupons = (coupons: DeliveryCoupon[]): number => {
  const now = Date.now();
  return coupons.filter((coupon) => !coupon.used && coupon.expiresAt > now).length;
};

const formatCouponExpiry = (expiresAt: number): string => {
  const date = new Date(expiresAt);
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${mm}-${dd}到期`;
};

export const TakeoutMe: React.FC<TakeoutMeProps> = ({
  profile,
  addresses,
  coupons,
  onOpenAddresses,
  onOpenCoupons,
  onAddAddress,
  onEditAddress,
  onDeleteAddress,
  onContactSupport,
  onOpenSettings,
  onOpenInvoice,
  onOpenPrivacy,
}) => {
  const [showAddressActions, setShowAddressActions] = React.useState<string | null>(null);
  const availableCouponCount = countAvailableCoupons(coupons);
  const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0] || null;
  const membership = membershipConfig[profile.membershipLevel];

  const functionItems = [
    { icon: <Headphones size={18} />, label: '联系客服', onClick: onContactSupport || (() => {}) },
    { icon: <Settings size={18} />, label: '设置', onClick: onOpenSettings || (() => {}) },
    { icon: <FileText size={18} />, label: '发票管理', onClick: onOpenInvoice || (() => {}) },
    { icon: <Shield size={18} />, label: '隐私政策', onClick: onOpenPrivacy || (() => {}) },
  ];

  return (
    <section className="space-y-4 pb-2">
      {/* 个人信息卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 p-4 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl text-white">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              '👤'
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">{profile.name}</h3>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${membership.bg} ${membership.color}`}>
              {membership.label}
            </span>
          </div>
          <button
            type="button"
            className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white active:bg-white/30"
            onClick={onOpenSettings}
          >
            编辑
          </button>
        </div>
      </motion.div>

      {/* 资产概览 */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          className="flex flex-col items-center justify-center rounded-2xl bg-white/90 p-4 shadow-sm active:scale-98"
          onClick={onOpenCoupons}
        >
          <Ticket size={24} className="text-orange-500" />
          <p className="mt-2 text-lg font-bold text-gray-800">{availableCouponCount}</p>
          <p className="text-xs text-gray-500">可用优惠券</p>
        </motion.button>
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          className="flex flex-col items-center justify-center rounded-2xl bg-white/90 p-4 shadow-sm active:scale-98"
          onClick={onOpenAddresses}
        >
          <MapPin size={24} className="text-blue-500" />
          <p className="mt-2 text-lg font-bold text-gray-800">{addresses.length}</p>
          <p className="text-xs text-gray-500">收货地址</p>
        </motion.button>
      </div>

      {/* 默认地址 */}
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">默认地址</h4>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-orange-600"
            onClick={onOpenAddresses}
          >
            管理 <ChevronRight size={14} />
          </button>
        </div>
        {defaultAddress ? (
          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-700">
                {defaultAddress.name} · {defaultAddress.phone}
              </p>
              <p className="mt-1 text-xs text-gray-500">{defaultAddress.detail}</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-xs text-gray-500"
            onClick={onOpenAddresses}
          >
            <Plus size={14} />
            添加收货地址
          </button>
        )}
      </div>

      {/* 优惠券预览 */}
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">优惠券</h4>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-orange-600"
            onClick={onOpenCoupons}
          >
            查看全部 <ChevronRight size={14} />
          </button>
        </div>
        {coupons.length === 0 ? (
          <p className="text-xs text-gray-500">暂无优惠券，去逛逛吧～</p>
        ) : (
          <div className="space-y-2">
            {coupons.slice(0, 3).map((coupon) => (
              <div
                key={coupon.id}
                className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium text-gray-800">{coupon.title}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    满{coupon.thresholdAmount}减{coupon.discountAmount} · {formatCouponExpiry(coupon.expiresAt)}
                  </p>
                </div>
                {coupon.used ? (
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] text-gray-500">已使用</span>
                ) : (
                  <span className="rounded bg-orange-200 px-2 py-0.5 text-[10px] text-orange-700">可用</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 常用功能 */}
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-800">常用功能</h4>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {functionItems.map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="flex flex-col items-center justify-center rounded-xl bg-gray-50 py-3"
              onClick={item.onClick}
            >
              <div className="text-gray-700">{item.icon}</div>
              <p className="mt-2 text-[10px] font-medium text-gray-600">{item.label}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 地址管理快捷入口 */}
      {addresses.length > 0 && (
        <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800">地址管理</h4>
            {onAddAddress && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-orange-600"
                onClick={onAddAddress}
              >
                <Plus size={14} />
                新增
              </button>
            )}
          </div>
          <div className="space-y-2">
            {addresses.slice(0, 3).map((address) => (
              <div
                key={address.id}
                className="relative flex items-start justify-between gap-2 rounded-xl bg-gray-50 p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-gray-800">
                      {address.name} · {address.phone}
                    </p>
                    {address.isDefault && (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-600">默认</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{address.detail}</p>
                </div>
                <div className="flex gap-1">
                  {onEditAddress && (
                    <button
                      type="button"
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      onClick={() => onEditAddress(address)}
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                  {onDeleteAddress && !address.isDefault && (
                    <button
                      type="button"
                      className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                      onClick={() => onDeleteAddress(address)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
