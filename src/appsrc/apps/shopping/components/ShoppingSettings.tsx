import React from 'react';
import styles from '../ShoppingApp.module.css';

interface ShoppingSettingsProps {
  notify: boolean;
  faceId: boolean;
  onToggleNotify: () => void;
  onToggleFaceId: () => void;
}

export const ShoppingSettings: React.FC<ShoppingSettingsProps> = ({
  notify,
  faceId,
  onToggleNotify,
  onToggleFaceId
}) => {
  return (
    <section className={styles.section}>
      <div className={styles.settingsList}>
        <div className={styles.settingItem}>
          <div>
            <strong>订单通知</strong>
            <span>下单与配送提醒</span>
          </div>
          <button
            className={`${styles.toggle} ${notify ? styles.toggleOn : ''}`}
            onClick={onToggleNotify}
            aria-label="切换订单通知"
          >
            <span />
          </button>
        </div>

        <div className={styles.settingItem}>
          <div>
            <strong>Face ID</strong>
            <span>用于快速支付确认</span>
          </div>
          <button
            className={`${styles.toggle} ${faceId ? styles.toggleOn : ''}`}
            onClick={onToggleFaceId}
            aria-label="切换 Face ID"
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  );
};
