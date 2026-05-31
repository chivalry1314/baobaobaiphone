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
  badgeCount = 0,
}) => {
  const IconComponent = icon ? (LucideIcons[icon] as React.ElementType) : null;
  const clockId = useId();
  const normalizedBadgeCount = Math.max(0, Math.floor(Number(badgeCount) || 0));
  const badgeLabel = normalizedBadgeCount > 99 ? '99+' : String(normalizedBadgeCount);

  return (
    <motion.div
      whileHover={isEditing ? undefined : { scale: 1.05 }}
      whileTap={isEditing ? undefined : { scale: 0.9 }}
      className={`relative flex flex-col items-center gap-1 cursor-pointer touch-none ${isEditing ? 'desktop-icon-jiggle' : ''}`}
      style={isEditing ? {
        animationDelay: `${jiggleDelayMs}ms`,
        animationDuration: `${jiggleDurationMs}ms`,
      } : undefined}
      onClick={isEditing ? undefined : onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {isEditing ? (
        <button
          type="button"
          className="absolute -right-2 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/45 bg-white/18 p-0 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_6px_14px_rgba(15,23,42,0.14)] backdrop-blur-xl"
          aria-label={canRemove ? '卸载应用' : '不可卸载'}
          onClick={(event) => {
            event.stopPropagation();
            if (canRemove) onRemove?.();
          }}
        >
          <span className="h-1 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.28)]" />
        </button>
      ) : null}
      {normalizedBadgeCount > 0 ? (
        <span
          className="absolute z-30 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF3B30] px-1.5 text-[11px] font-semibold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.22)] ring-2 ring-white"
          style={{
            right: '8px',
            top: '-7px',
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
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: frosted > 0 ? `blur(${frosted}px)` : 'none',
          WebkitBackdropFilter: frosted > 0 ? `blur(${frosted}px)` : 'none',
          boxShadow: `0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.15)`,
          border: '1px solid rgba(255,255,255,0.5)'
        }}
      >
        {isClock ? (
          <div className="relative w-full h-full p-2">
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
              <div key={i} className="w-2.5 h-2.5 bg-black/30 rounded-[3px] border border-black/10" />
            ))}
          </div>
        ) : customIcon ? (
          customIcon
        ) : IconComponent ? (
          <IconComponent size={size * 0.5} className="text-black" strokeWidth={1.5} />
        ) : null}
      </div>
      {label && <span className="text-[11px] font-medium text-black/90 tracking-wide">{label}</span>}
    </motion.div>
  );
};
