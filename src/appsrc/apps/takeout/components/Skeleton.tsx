import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | false;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-200';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
    rounded: 'rounded-xl',
  };

  const animationClass = animation === 'pulse' ? 'animate-pulse' : animation === 'wave' ? 'animate-pulse' : '';

  const style: React.CSSProperties = {};
  if (width !== undefined) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height !== undefined) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export interface SkeletonMerchantCardProps {}

export const SkeletonMerchantCard: React.FC<SkeletonMerchantCardProps> = () => {
  return (
    <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Skeleton variant="rounded" width={60} height={60} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={16} width="70%" />
          <Skeleton variant="text" height={12} width="50%" />
          <Skeleton variant="text" height={12} width="40%" />
        </div>
      </div>
    </div>
  );
};

export interface SkeletonOrderCardProps {}

export const SkeletonOrderCard: React.FC<SkeletonOrderCardProps> = () => {
  return (
    <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" height={16} width="40%" />
        <Skeleton variant="text" height={12} width="20%" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton variant="text" height={12} width="80%" />
        <Skeleton variant="text" height={12} width="60%" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton variant="text" height={14} width="30%" />
        <Skeleton variant="rounded" width={60} height={24} />
      </div>
    </div>
  );
};

export interface SkeletonProfileProps {}

export const SkeletonProfile: React.FC<SkeletonProfileProps> = () => {
  return (
    <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={56} height={56} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={16} width="50%" />
          <Skeleton variant="text" height={12} width="30%" />
        </div>
      </div>
    </div>
  );
};
