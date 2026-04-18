import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | false;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className = '',
}) => {
  const baseClasses = `skeleton skeleton-${variant} ${animation ? `skeleton-${animation}` : ''} ${className}`;
  
  const style: React.CSSProperties = {
    width,
    height,
  };

  return <div className={baseClasses} style={style} />;
};

export interface SkeletonListProps {
  count?: number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  height?: number | string;
  gap?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  variant = 'text',
  height,
  gap = 8,
}) => {
  return (
    <div className="skeleton-list" style={{ gap: `${gap}px` }}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} variant={variant} height={height} />
      ))}
    </div>
  );
};
