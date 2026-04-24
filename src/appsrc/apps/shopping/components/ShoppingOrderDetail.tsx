import React from 'react';
import { Film, Share2 } from 'lucide-react';
import type { Order } from '../types';
import {
  formatDateTime,
  formatMoney,
  getLogisticsSteps,
  getOrderStatus,
  hasOrderLogistics,
  isOrderPendingPayment,
} from '../utils';
import styles from '../ShoppingApp.module.css';

interface ShoppingOrderDetailProps {
  order?: Order;
  onBackOrders: () => void;
  onViewLogistics: (orderId: string) => void;
  onOpenPaymentOptions?: (orderId: string) => void;
  onShareMovieTicket?: (orderId: string) => void;
}

const resolvePickupCode = (order: Order) => {
  const storedCode = String(order.meta?.pickupCode ?? '').trim();
  if (/^\d{6}$/.test(storedCode)) return storedCode;
  const digits = order.id.replace(/\D/g, '');
  if (digits.length >= 6) return digits.slice(-6);
  return digits.padStart(6, '0').slice(-6) || '462800';
};

export const ShoppingOrderDetail: React.FC<ShoppingOrderDetailProps> = ({
  order,
  onBackOrders,
  onViewLogistics,
  onOpenPaymentOptions,
  onShareMovieTicket,
}) => {
  if (!order) {
    return (
      <section className={styles.section}>
        <div className={styles.empty}>
          <p>订单不存在或已删除。</p>
          <button className={styles.primaryBtn} onClick={onBackOrders}>
            返回订单
          </button>
        </div>
      </section>
    );
  }

  const orderStatus = getOrderStatus(order);
  const canShowLogistics = hasOrderLogistics(order);
  const isPendingPayment = isOrderPendingPayment(order);
  const delegateRejected = String(order.meta?.delegateStatus ?? '').trim().toLowerCase() === 'rejected';
  const pickupCode = resolvePickupCode(order);
  const giftRecipientName = String(order.meta?.giftRecipientName ?? '').trim();
  const giftRecipientAvatar = String(order.meta?.giftRecipientAvatar ?? '').trim();
  const isGiftOrder = Boolean(String(order.meta?.giftRecipientContactId ?? '').trim() && giftRecipientName);
  const giftRecipientInitial = giftRecipientName ? giftRecipientName.slice(0, 2).toUpperCase() : 'TA';

  return (
    <section className={styles.section}>
      <div className={styles.detailHeader}>
        <div>
          <h2>{order.title}</h2>
          <p>
            {formatDateTime(order.createdAt)} · {orderStatus}
          </p>
        </div>
        <div className={styles.detailTotal}>{formatMoney(order.total)}</div>
      </div>

      {order.kind === 'movie' ? (
        <div className={styles.cnTicket}>
          <div className={styles.cnTicketHeader}>
            <div>
              <strong></strong>
              <p>{String(order.meta?.cinema ?? '')}</p>
            </div>
            <div className={styles.cnTicketHeaderRight}>
              <div className={styles.cnTicketBadge}>
                <Film size={18} />
                <span>{order.id}</span>
              </div>
              {onShareMovieTicket ? (
                <button
                  type="button"
                  className={styles.cnTicketShareBtn}
                  onClick={() => onShareMovieTicket(order.id)}
                  aria-label="分享票据"
                >
                  <Share2 size={16} />
                </button>
              ) : null}
            </div>
          </div>
          <div className={styles.cnTicketBody}>
            <div>
              <span>名称</span>
              <strong>{String(order.meta?.movieTitle ?? '')}</strong>
            </div>
            <div>
              <span>日期</span>
              <strong>{String(order.meta?.date ?? '')}</strong>
            </div>
            <div>
              <span>场次</span>
              <strong>{String(order.meta?.time ?? '')}</strong>
            </div>
            <div>
              <span>VIP厅</span>
              <strong>{String(order.meta?.hall ?? '')}</strong>
            </div>
            <div>
              <span>座位</span>
              <strong>{String(order.meta?.seat ?? '')}</strong>
            </div>
            <div>
              <span>数量</span>
              <strong>{order.lines[0]?.qty ?? 1} 张</strong>
            </div>
          </div>
          <div className={styles.cnTicketFooter}>
            <div className={styles.barcode} />
            <div className={styles.cnTicketHint}>取票码 {pickupCode}</div>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.detailCard}>
            <h3>商品明细</h3>
            <div className={styles.detailLines}>
              {order.lines.map((line) => (
                <div key={line.name}>
                  <span>{line.name}</span>
                  <em>x{line.qty}</em>
                  <strong>{formatMoney(line.qty * line.unitPrice)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.detailCard}>
            <h3>配送地址</h3>
            {isGiftOrder ? (
              <div className={styles.giftRecipientBlock}>
                <div className={styles.giftRecipientAvatar}>
                  {giftRecipientAvatar ? (
                    <img
                      src={giftRecipientAvatar}
                      alt={giftRecipientName}
                      className={styles.giftRecipientAvatarImage}
                    />
                  ) : (
                    <span>{giftRecipientInitial}</span>
                  )}
                </div>
                <div className={styles.giftRecipientMeta}>
                  <strong>{giftRecipientName}</strong>
                  <span>送TA礼物</span>
                </div>
              </div>
            ) : order.address ? (
              <div className={styles.addressBlock}>
                <div className={styles.addressTop}>
                  <strong>{order.address.name}</strong>
                  <span>{order.address.phone}</span>
                </div>
                <p>{order.address.address}</p>
              </div>
            ) : (
              <p className={styles.muted}>未选择地址</p>
            )}
          </div>

          <div className={styles.detailCard}>
            <h3>物流信息</h3>
            {canShowLogistics ? (
              <>
                <div className={styles.logisticsHeaderRow}>
                  <div className={styles.logisticsTitle}>
                    <strong>{orderStatus}</strong>
                    <span>运单号 {String(order.meta?.trackingId ?? '--')}</span>
                  </div>
                  <button className={styles.smallBtn} onClick={() => onViewLogistics(order.id)}>
                    查看详情
                  </button>
                </div>
                <div className={styles.logistics}>
                  {(() => {
                    const { steps, activeIndex } = getLogisticsSteps(order);
                    return (
                      <div className={styles.timeline}>
                        {steps.slice(0, 4).map((step, idx) => (
                          <div
                            key={step.label}
                            className={`${styles.timelineItem} ${idx <= activeIndex ? styles.timelineOn : ''}`}
                          >
                            <span>{step.label}</span>
                            <em>{formatDateTime(step.at)}</em>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <p className={styles.muted}>订单待付款时不会发货，暂无物流信息。</p>
            )}
          </div>
        </>
      )}

      {isPendingPayment && onOpenPaymentOptions ? (
        <div className={styles.detailFooter}>
          {delegateRejected ? (
            <p className={styles.detailNotice}>当前订单代付失败，请重新选择支付方式。</p>
          ) : null}
          <button
            type="button"
            className={styles.detailPrimaryBtn}
            onClick={() => onOpenPaymentOptions(order.id)}
          >
            合并支付
          </button>
        </div>
      ) : null}
    </section>
  );
};
