import React from 'react';
import type { DeliveryOrder } from '../types';
import {
  formatDateTime,
  formatMoney,
  getOrderStatusLabel,
  isOrderOngoing,
  resolveOrderLiveStatus,
} from '../utils';

interface TakeoutOrderDetailProps {
  order: DeliveryOrder;
  onReorder: (orderId: string) => void;
  onUrge: (orderId: string) => void;
  onAfterSale: (orderId: string) => void;
  onRate: (orderId: string) => void;
}

export const TakeoutOrderDetail: React.FC<TakeoutOrderDetailProps> = ({
  order,
  onReorder,
  onUrge,
  onAfterSale,
  onRate,
}) => {
  const liveStatus = resolveOrderLiveStatus(order);

  const timeline = [...order.timeline].sort((left, right) => right.at - left.at);

  return (
    <section className="space-y-4 pb-2">
      <article className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-800">{order.merchantName}</h3>
          <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700">
            {getOrderStatusLabel(liveStatus)}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500">订单号：{order.id}</p>
        <p className="mt-1 text-xs text-gray-500">下单时间：{formatDateTime(order.createdAt)}</p>
        {order.scheduleAt ? (
          <p className="mt-1 text-xs text-gray-500">预约时间：{formatDateTime(order.scheduleAt)}</p>
        ) : null}
        <p className="mt-1 text-xs text-gray-500">收货地址：{order.address.detail}</p>
      </article>

      <article className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800">商品明细</h3>
        <div className="mt-3 space-y-2">
          {order.lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between text-xs text-gray-700">
              <span>
                {line.dishName} x{line.qty}
              </span>
              <span>{formatMoney(line.unitPrice * line.qty)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1 border-t border-gray-200 pt-2 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span>商品金额</span>
            <span>{formatMoney(order.itemTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>打包费</span>
            <span>{formatMoney(order.packageFee)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>配送费</span>
            <span>{formatMoney(order.deliveryFee)}</span>
          </div>
          <div className="flex items-center justify-between text-orange-600">
            <span>优惠抵扣</span>
            <span>-{formatMoney(order.discountFee)}</span>
          </div>
          <div className="flex items-center justify-between pt-1 text-sm font-semibold text-gray-900">
            <span>实付金额</span>
            <span>{formatMoney(order.payableAmount)}</span>
          </div>
        </div>
      </article>

      <article className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800">配送状态时间线</h3>
        <div className="mt-3 space-y-3">
          {timeline.map((item, index) => (
            <div key={item.id} className="flex items-start gap-2">
              <div className="mt-1 h-2 w-2 rounded-full bg-gray-900" />
              <div>
                <p className="text-xs font-medium text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-500">{formatDateTime(item.at)}</p>
                {item.note ? <p className="text-xs text-gray-500">{item.note}</p> : null}
              </div>
              {index === 0 ? <span className="ml-auto text-[11px] text-orange-600">最新</span> : null}
            </div>
          ))}
        </div>
      </article>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="rounded-xl bg-gray-100 py-2 text-xs font-medium text-gray-700"
          onClick={() => onReorder(order.id)}
        >
          再来一单
        </button>
        {isOrderOngoing(liveStatus) ? (
          <button
            type="button"
            className="rounded-xl bg-gray-100 py-2 text-xs font-medium text-gray-700"
            onClick={() => onUrge(order.id)}
          >
            催单（{order.urgeCount}）
          </button>
        ) : (
          <button
            type="button"
            className="rounded-xl bg-gray-100 py-2 text-xs font-medium text-gray-700"
            onClick={() => onAfterSale(order.id)}
          >
            申请售后
          </button>
        )}
        {!order.rated && liveStatus === 'completed' ? (
          <button
            type="button"
            className="col-span-2 rounded-xl bg-gray-900 py-2 text-xs font-medium text-white"
            onClick={() => onRate(order.id)}
          >
            去评价
          </button>
        ) : null}
      </div>
    </section>
  );
};
