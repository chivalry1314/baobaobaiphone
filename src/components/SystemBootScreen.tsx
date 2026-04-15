import React from 'react';
import { motion } from 'motion/react';

interface SystemBootScreenProps {
  version: string;
}

export const SystemBootScreen: React.FC<SystemBootScreenProps> = ({ version }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="absolute inset-0 z-[120] flex flex-col items-center justify-center gap-6 bg-[#08101A] text-white"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0.85 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex flex-col items-center gap-2"
      >
        <div className="text-[34px] font-semibold tracking-[0.04em]">BaobaobaiOS</div>
        <div className="text-[14px] text-white/75 tracking-[0.16em]">SYSTEM STARTING</div>
      </motion.div>

      <div className="h-1.5 w-44 overflow-hidden rounded-full bg-white/15">
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="h-full w-1/2 rounded-full bg-white/85"
        />
      </div>

      <div className="text-xs text-white/60 tracking-[0.12em]">VERSION v{version}</div>
    </motion.div>
  );
};
