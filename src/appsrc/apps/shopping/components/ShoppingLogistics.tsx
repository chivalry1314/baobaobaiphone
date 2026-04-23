import React from 'react';
import type { Order } from '../types';
import { formatDateTime, getLogisticsSteps, getOrderStatus, hasOrderLogistics } from '../utils';
import styles from '../ShoppingApp.module.css';

interface ShoppingLogisticsProps {
  order?: Order;
  onBackOrders: () => void;
}

export const ShoppingLogistics: React.FC<ShoppingLogisticsProps> = ({ order, onBackOrders }) => {
  if (!order) {
    return (
      <section className={styles.section}>
        <div className={styles.empty}>
          <p>未找到该订单。</p>
          <button className={styles.primaryBtn} onClick={onBackOrders}>
            返回订单
          </button>
        </div>
      </section>
    );
  }

  const canShowLogistics = hasOrderLogistics(order);
  const { steps, activeIndex } = getLogisticsSteps(order);

  return (
    <section className={styles.section}>
      <div className={styles.detailCard}>
        <h3>物流详情</h3>
        {canShowLogistics ? (
          <>
            <div className={styles.logisticsHeaderRow}>
              <div className={styles.logisticsTitle}>
                <strong>{getOrderStatus(order)}</strong>
                <span>运单号 {String(order.meta?.trackingId ?? '--')}</span>
              </div>
            </div>
            <div className={styles.timelineBig}>
              {steps.map((step, idx) => (
                <div
                  key={step.label}
                  className={`${styles.timelineBigItem} ${idx <= activeIndex ? styles.timelineOn : ''}`}
                >
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineText}>
                    <strong>{step.label}</strong>
                    <span>{formatDateTime(step.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className={styles.muted}>订单待付款时不会发货，暂无物流信息。</p>
        )}
      </div>
    </section>
  );
};
