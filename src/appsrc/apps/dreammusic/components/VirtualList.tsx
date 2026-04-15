import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  overscan?: number;
  className?: string;
  empty?: React.ReactNode;
  itemKey?: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export const VirtualList = <T,>({
  items,
  height,
  itemHeight,
  overscan = 4,
  className,
  empty,
  itemKey,
  renderItem,
}: VirtualListProps<T>) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const safeHeight = Math.max(1, Math.floor(height));
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
    useAnimationFrameWithResizeObserver: true,
  });

  if (items.length === 0) return <>{empty ?? null}</>;

  return (
    <div
      ref={parentRef}
      className={className}
      style={{ height: safeHeight, overflowY: 'auto', overflowX: 'hidden' }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const index = virtualItem.index;
          const item = items[index];
          if (item === undefined) return null;
          const key = itemKey ? itemKey(item, index) : String(index);
          return (
            <div
              key={key}
              data-index={index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
                height: virtualItem.size,
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
