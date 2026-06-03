import React from 'react';
import { motion } from 'motion/react';

import type { ThemeVisualTokens } from '../core/theme/types';

interface SystemBootScreenProps {
  version: string;
  tokens?: Pick<ThemeVisualTokens, 'systemBg' | 'accent' | 'statusFg' | 'statusMuted'>;
}

export const SystemBootScreen: React.FC<SystemBootScreenProps> = ({ version, tokens }) => {
  const systemBg = tokens?.systemBg || '#eff6ff';
  const accent = tokens?.accent || '#10b981';
  const statusFg = tokens?.statusFg || '#111827';
  const statusMuted = tokens?.statusMuted || 'rgba(17,24,39,0.78)';

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="absolute inset-0 z-[120] flex flex-col items-center justify-center gap-6"
      style={{
        background: `radial-gradient(circle at top, color-mix(in srgb, ${accent} 28%, transparent), transparent 42%), ${systemBg}`,
        color: statusFg,
      }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0.85 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex flex-col items-center gap-2"
      >
        <div className="text-[34px] font-semibold tracking-[0.04em]">BaobaobaiOS</div>
        <div className="text-[14px] tracking-[0.16em]" style={{ color: statusMuted }}>
          SYSTEM STARTING
        </div>
      </motion.div>

      <div
        className="h-1.5 w-44 overflow-hidden rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${statusFg} 14%, transparent)` }}
      >
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="h-full w-1/2 rounded-full"
          style={{ backgroundColor: accent }}
        />
      </div>

      <div className="text-xs tracking-[0.12em]" style={{ color: statusMuted }}>
        VERSION v{version}
      </div>
    </motion.div>
  );
};
