import React from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from '../ShoppingApp.module.css';

interface ShoppingHeaderProps {
  title: string;
  isRoot: boolean;
  onBack: () => void;
}

export const ShoppingHeader: React.FC<ShoppingHeaderProps> = ({ title, isRoot, onBack }) => {
  return (
    <header className={styles.header}>
      <button onClick={onBack} className={styles.backButton} aria-label={isRoot ? '关闭' : '返回'}>
        <ChevronLeft size={24} />
        <span>{isRoot ? '关闭' : '返回'}</span>
      </button>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.headerRight} />
    </header>
  );
};
