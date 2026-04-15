import React from 'react';
import { motion } from 'motion/react';

interface WidgetProps {
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
}

export const Widget: React.FC<WidgetProps> = ({ title, children, size = 'medium', className = '', style }) => {
  const sizeClasses = {
    small: 'w-[155px] h-[155px]',
    medium: 'w-full h-[155px]',
    large: 'w-full h-[325px]',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass rounded-[2.2rem] p-4 flex flex-col ios-shadow ${sizeClasses[size]} ${className}`}
      style={style}
    >
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
      {title && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-full text-center">
          <span className="text-[11px] font-medium text-black/80 tracking-wide">{title}</span>
        </div>
      )}
    </motion.div>
  );
};
