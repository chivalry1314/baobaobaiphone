import React, { useId } from 'react';
import { motion } from 'motion/react';
import * as LucideIcons from 'lucide-react';

interface AppIconProps {
  name: string;
  icon?: keyof typeof LucideIcons;
  color?: string;
  label?: string;
  customIcon?: React.ReactNode;
  isFolder?: boolean;
  isClock?: boolean;
  onClick?: () => void;
  isEditing?: boolean;
  canRemove?: boolean;
  onRemove?: () => void;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onPointerMove?: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp?: React.PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLDivElement>;
  jiggleDelayMs?: number;
  jiggleDurationMs?: number;
  isEditSettling?: boolean;
  badgeCount?: number;
  // 全局样式
  size?: number;
  radius?: number;
  frosted?: number;
  shadow?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({
  icon,
  label,
  customIcon,
  isFolder,
  isClock,
  onClick,
  size = 60,
  radius = 18,
  frosted = 10,
  shadow = 8,
  isEditing = false,
  canRemove = false,
  onRemove,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  jiggleDelayMs = 0,
  jiggleDurationMs = 920,
  isEditSettling = false,
  badgeCount = 0,
}) => {
  const IconComponent = icon ? (LucideIcons[icon] as React.ElementType) : null;
  const clockId = useId();
  const normalizedBadgeCount = Math.max(0, Math.floor(Number(badgeCount) || 0));
  const badgeLabel = normalizedBadgeCount > 99 ? '99+' : String(normalizedBadgeCount);
  const labelWidth = Math.max(size + 24, 76);
  const labelLineHeight = 14;
  const labelReservedHeight = label ? labelLineHeight : 0;
  const showEditControls = isEditing && !isEditSettling;
  const suppressPressMotion = isEditing || isEditSettling;
  const rootStyle: React.CSSProperties = {
    width: `${labelWidth}px`,
    minHeight: `${size + labelReservedHeight}px`,
    margin: '0 auto',
  };

  if (isEditing && !isEditSettling) {
    rootStyle.animationDelay = `${jiggleDelayMs}ms`;
    rootStyle.animationDuration = `${jiggleDurationMs}ms`;
  }

  return (
    <motion.div
      whileHover={suppressPressMotion ? undefined : { scale: 1.05 }}
      whileTap={suppressPressMotion ? undefined : { scale: 0.9 }}
      className={`relative flex flex-col items-center gap-1 cursor-pointer touch-none ${
        isEditing ? (isEditSettling ? 'desktop-icon-jiggle-settle' : 'desktop-icon-jiggle') : ''
      }`}
      style={rootStyle}
      onClick={suppressPressMotion ? undefined : onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {showEditControls ? (
        <button
          type="button"
          className="absolute -right-2 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full p-0 backdrop-blur-xl"
          aria-label={canRemove ? '卸载应用' : '不可卸载'}
          style={{
            border: '1px solid var(--sys-icon-border)',
            backgroundColor: 'var(--sys-surface)',
            color: 'var(--sys-icon-glyph)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), 0 6px 14px var(--sys-shadow-color)',
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (canRemove) onRemove?.();
          }}
        >
          <span
            className="h-1 w-4 rounded-full"
            style={{
              backgroundColor: 'var(--sys-icon-border)',
              boxShadow: '0 1px 3px var(--sys-shadow-color)',
            }}
          />
        </button>
      ) : null}
      {normalizedBadgeCount > 0 ? (
        <span
          className="absolute z-30 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none"
          style={{
            right: '8px',
            top: '-7px',
            backgroundColor: 'var(--sys-badge-bg)',
            color: 'var(--sys-badge-text)',
            boxShadow: '0 2px 6px var(--sys-shadow-color)',
            border: '2px solid var(--sys-badge-ring)',
          }}
        >
          {badgeLabel}
        </span>
      ) : null}
      <div
        className="flex items-center justify-center relative overflow-hidden group"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${radius}px`,
          backgroundColor: 'var(--sys-icon-bg)',
          backdropFilter: frosted > 0 ? `blur(${frosted}px)` : 'none',
          WebkitBackdropFilter: frosted > 0 ? `blur(${frosted}px)` : 'none',
          boxShadow: `0 ${shadow}px ${shadow * 2}px var(--sys-icon-shadow-color)`,
          border: 'var(--sys-icon-border-width) solid var(--sys-icon-border)',
          color: 'var(--sys-icon-glyph)',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            inset: 'var(--sys-icon-inner-inset)',
            borderRadius: `calc(${radius}px - var(--sys-icon-inner-inset))`,
            backgroundColor: 'var(--sys-icon-inner-bg)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            inset: 'var(--sys-icon-inner-inset)',
            borderRadius: `calc(${radius}px - var(--sys-icon-inner-inset))`,
            backgroundImage: 'var(--sys-icon-texture)',
            opacity: 0.85,
          }}
        />
        {isClock ? (
          <div className="relative h-full w-full p-2">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <radialGradient id={`clock-face-${clockId}`} cx="50%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                  <stop offset="65%" stopColor="rgba(255,255,255,0.85)" />
                  <stop offset="100%" stopColor="rgba(240,240,240,0.9)" />
                </radialGradient>
              </defs>

              <circle cx="50" cy="50" r="46" fill={`url(#clock-face-${clockId})`} stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />

              {Array.from({ length: 60 }).map((_, i) => {
                const isMajor = i % 5 === 0;
                return (
                  <line
                    key={i}
                    x1="50"
                    y1={isMajor ? "8" : "10"}
                    x2="50"
                    y2={isMajor ? "14" : "12"}
                    stroke={isMajor ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.18)"}
                    strokeWidth={isMajor ? 1.6 : 1}
                    transform={`rotate(${i * 6} 50 50)`}
                  />
                );
              })}

              <line x1="50" y1="50" x2="50" y2="26" stroke="rgba(0,0,0,0.75)" strokeWidth="3" strokeLinecap="round" transform="rotate(300 50 50)" />
              <line x1="50" y1="50" x2="50" y2="18" stroke="rgba(0,0,0,0.75)" strokeWidth="2" strokeLinecap="round" transform="rotate(60 50 50)" />
              <line x1="50" y1="52" x2="50" y2="14" stroke="rgba(220,38,38,0.9)" strokeWidth="1.2" strokeLinecap="round" transform="rotate(18 50 50)" />

              <circle cx="50" cy="50" r="3.2" fill="rgba(0,0,0,0.85)" />
              <circle cx="50" cy="50" r="1.6" fill="white" />
            </svg>
          </div>
        ) : isFolder ? (
          <div className="grid grid-cols-3 gap-1.5 p-2">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--sys-icon-glyph) 24%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--sys-icon-glyph) 10%, transparent)',
                }}
              />
            ))}
          </div>
        ) : customIcon ? (
          customIcon
        ) : IconComponent ? (
          <IconComponent size={size * 0.5} strokeWidth={1.8} className="relative z-10" />
        ) : null}
      </div>
      {label ? (
        <span
          className="block whitespace-normal text-center text-[11px] font-medium"
          style={{
            width: `${labelWidth}px`,
            minHeight: `${labelReservedHeight}px`,
            lineHeight: `${labelLineHeight}px`,
            color: 'var(--sys-icon-label)',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {label}
        </span>
      ) : null}
    </motion.div>
  );
};
