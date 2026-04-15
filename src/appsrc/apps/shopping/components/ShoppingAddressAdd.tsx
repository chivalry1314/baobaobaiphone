import React from 'react';
import styles from '../ShoppingApp.module.css';

interface ShoppingAddressAddProps {
  name: string;
  phone: string;
  address: string;
  saveLabel?: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onSave: () => void;
  canSave: boolean;
}

export const ShoppingAddressAdd: React.FC<ShoppingAddressAddProps> = ({
  name,
  phone,
  address,
  saveLabel = '保存',
  onNameChange,
  onPhoneChange,
  onAddressChange,
  onSave,
  canSave
}) => {
  return (
    <section className={styles.section}>
      <div className={styles.formCard}>
        <div className={styles.formRow}>
          <label>收货人</label>
          <input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="姓名" />
        </div>
        <div className={styles.formRow}>
          <label>手机号</label>
          <input value={phone} onChange={(e) => onPhoneChange(e.target.value)} placeholder="11 位手机号" />
        </div>
        <div className={styles.formRow}>
          <label>详细地址</label>
          <input value={address} onChange={(e) => onAddressChange(e.target.value)} placeholder="省市区街道门牌号" />
        </div>
        <button className={styles.primaryBtn} onClick={onSave} disabled={!canSave}>
          {saveLabel}
        </button>
      </div>
    </section>
  );
};
