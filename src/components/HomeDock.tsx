import React from 'react';
import * as LucideIcons from 'lucide-react';
import { AppIcon } from './AppIcon';

interface HomeDockProps {
  onOpenPhone?: () => void;
  bottomOffset?: number;
  isEditing?: boolean;
}

export const HomeDock: React.FC<HomeDockProps> = ({
  onOpenPhone,
  bottomOffset = 18,
  isEditing = false,
}) => {
  const defaultDockIcons = [
    { name: 'Phone', icon: 'Phone' as const, onClick: onOpenPhone },
    { name: 'Safari', icon: 'Compass' as const },
    { name: 'Messages', icon: 'MessageCircle' as const },
    { name: 'Camera', icon: 'Camera' as const },
  ];
  const [dockOrder, setDockOrder] = React.useState(() => defaultDockIcons.map((item) => item.name));
  const dockIconRefs = React.useRef(new Map<string, HTMLDivElement>());
  const draggingRef = React.useRef<{ name: string; pointerId: number; startX: number; startY: number } | null>(null);
  const [draggingDockIcon, setDraggingDockIcon] = React.useState<{ name: string; dx: number; dy: number } | null>(null);

  const dockIconMap = React.useMemo(
    () => new Map(defaultDockIcons.map((item) => [item.name, item])),
    [onOpenPhone]
  );
  const dockIcons = dockOrder
    .map((name) => dockIconMap.get(name))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const isCompactPaperDock =
    typeof document !== 'undefined' &&
    getComputedStyle(document.documentElement).getPropertyValue('--sys-dock-item-mode').trim() === 'compact-paper';

  const endDockDrag = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const entries = dockOrder
      .filter((name) => name !== drag.name)
      .map((name) => {
        const element = dockIconRefs.current.get(name);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { name, centerX: rect.left + rect.width / 2 };
      })
      .filter((entry): entry is { name: string; centerX: number } => Boolean(entry))
      .sort((left, right) => left.centerX - right.centerX);
    const insertIndex = entries.findIndex((entry) => event.clientX < entry.centerX);
    const nextOrder = entries.map((entry) => entry.name);
    nextOrder.splice(insertIndex < 0 ? nextOrder.length : insertIndex, 0, drag.name);
    setDockOrder(nextOrder);
    draggingRef.current = null;
    setDraggingDockIcon(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [dockOrder]);

  return (
    <div
      className="absolute inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: `${bottomOffset}px` }}
    >
      <div
        className="glass flex w-[92%] items-end justify-around px-4 py-3"
        style={{
          backgroundColor: 'var(--sys-dock-bg)',
          border: 'var(--sys-dock-border-width) solid var(--sys-dock-border)',
          borderRadius: 'var(--sys-dock-radius)',
          boxShadow: 'var(--sys-dock-shadow)',
          backdropFilter: `blur(var(--sys-dock-blur))`,
          WebkitBackdropFilter: `blur(var(--sys-dock-blur))`,
        }}
      >
        <div
          className="flex h-[72px] w-full items-center"
          style={
            isCompactPaperDock
              ? {
                  justifyContent: 'center',
                  gap: '0.9rem',
                }
              : {
                  justifyContent: 'space-around',
                }
          }
        >
          {dockIcons.map((item, index) => {
            const draggingOffset = draggingDockIcon?.name === item.name ? draggingDockIcon : null;
            const DockIconComponent = LucideIcons[item.icon] as React.ElementType;
            return (
              <div
                key={item.name}
                ref={(element) => {
                  if (element) dockIconRefs.current.set(item.name, element);
                  else dockIconRefs.current.delete(item.name);
                }}
                style={{
                  transform: draggingOffset
                    ? `translate3d(${draggingOffset.dx}px, ${draggingOffset.dy}px, 0)`
                    : undefined,
                  transition: draggingOffset ? 'none' : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
                  zIndex: draggingOffset ? 60 : undefined,
                }}
              >
                {isCompactPaperDock ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    onPointerDown={(event) => {
                      if (!isEditing || event.button !== 0) return;
                      draggingRef.current = {
                        name: item.name,
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startY: event.clientY,
                      };
                      setDraggingDockIcon({ name: item.name, dx: 0, dy: 0 });
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      const drag = draggingRef.current;
                      if (!isEditing || !drag || drag.pointerId !== event.pointerId) return;
                      setDraggingDockIcon({
                        name: drag.name,
                        dx: event.clientX - drag.startX,
                        dy: event.clientY - drag.startY,
                      });
                    }}
                    onPointerUp={endDockDrag}
                    onPointerCancel={endDockDrag}
                    className="flex items-center justify-center transition-transform active:scale-95"
                    style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '999px',
                      border: '2px solid transparent',
                      backgroundColor: 'transparent',
                      color: 'var(--sys-icon-glyph)',
                      boxShadow: 'none',
                    }}
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--sys-icon-bg)',
                        border: 'var(--sys-icon-border-width) solid var(--sys-icon-border)',
                        color: 'var(--sys-icon-glyph)',
                      }}
                    >
                      <DockIconComponent size={28} strokeWidth={2.35} />
                    </div>
                  </button>
                ) : (
                  <AppIcon
                    name={item.name}
                    icon={item.icon}
                    onClick={item.onClick}
                    isEditing={isEditing}
                    jiggleDelayMs={-index * 180}
                    jiggleDurationMs={720 + index * 55}
                    onPointerDown={(event) => {
                      if (!isEditing || event.button !== 0) return;
                      draggingRef.current = {
                        name: item.name,
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startY: event.clientY,
                      };
                      setDraggingDockIcon({ name: item.name, dx: 0, dy: 0 });
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      const drag = draggingRef.current;
                      if (!isEditing || !drag || drag.pointerId !== event.pointerId) return;
                      setDraggingDockIcon({
                        name: drag.name,
                        dx: event.clientX - drag.startX,
                        dy: event.clientY - drag.startY,
                      });
                    }}
                    onPointerUp={endDockDrag}
                    onPointerCancel={endDockDrag}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
