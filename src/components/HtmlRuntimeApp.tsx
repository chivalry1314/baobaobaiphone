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
      className="absolute inset-0 z-50 bg-white flex flex-col"
    >
      <header className="px-2 pt-12 pb-3 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center">
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 flex items-center gap-1 p-2 active:scale-95 transition-transform"
        >
          <ChevronLeft size={28} />
          <span className="text-[16px]">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-slate-800 pr-10">{name}</h1>
      </header>

      <iframe
        title={name}
        srcDoc={html}
        className="w-full flex-1 border-0 bg-white"
        sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox"
      />
    </motion.div>
  );
};
