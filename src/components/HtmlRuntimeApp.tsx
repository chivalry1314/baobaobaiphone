import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../core/appOpenMotion';

interface HtmlRuntimeAppProps {
  name: string;
  html: string;
  onClose: () => void;
}

export const HtmlRuntimeApp: React.FC<HtmlRuntimeAppProps> = ({ name, html, onClose }) => {
  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: 'var(--sys-system-bg)',
        color: 'var(--sys-surface-text)',
      }}
    >
      <header
        className="flex items-center px-2 pb-3 pt-12 backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--sys-surface-strong) 82%, transparent)',
          borderBottom: '1px solid var(--sys-border)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 p-2 transition-transform active:scale-95"
          style={{ color: 'var(--sys-muted-text)' }}
        >
          <ChevronLeft size={28} />
          <span className="text-[16px]">返回</span>
        </button>
        <h1
          className="flex-1 pr-10 text-center text-[17px] font-semibold"
          style={{ color: 'var(--sys-surface-text)' }}
        >
          {name}
        </h1>
      </header>

      <iframe
        title={name}
        srcDoc={html}
        className="w-full flex-1 border-0"
        style={{ backgroundColor: 'var(--sys-system-bg)' }}
        sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox"
      />
    </motion.div>
  );
};
