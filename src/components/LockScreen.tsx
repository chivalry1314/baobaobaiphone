import React from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ y: 0 }}
      exit={{ y: '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-[100] flex flex-col items-center justify-between py-20 px-8"
      style={{ color: 'var(--sys-status-fg)' }}
      onClick={onUnlock}
    >
      {/* Background with more blur */}
      <div className="absolute inset-0 z-0" style={{ backgroundColor: 'var(--sys-system-bg)' }}>
        <img 
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=2000&auto=format&fit=crop" 
          alt="Wallpaper" 
          className="w-full h-full object-cover scale-110"
          referrerPolicy="no-referrer"
        />
        <div
          className="absolute inset-0 backdrop-blur-xl"
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in srgb, var(--sys-system-bg) 26%, transparent), color-mix(in srgb, var(--sys-surface-strong) 48%, transparent))',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2">
        <Lock size={24} className="mb-4" style={{ color: 'var(--sys-status-muted)' }} />
        <span className="text-8xl font-thin tracking-tighter">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
        <span className="text-xl font-medium" style={{ color: 'var(--sys-status-muted)' }}>
          {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-12 h-12 glass rounded-full flex items-center justify-center animate-bounce">
          <motion.div 
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-1.5 h-1.5 rotate-45 border-l-2 border-t-2"
            style={{ borderColor: 'var(--sys-status-fg)' }}
          />
        </div>
        <span
          className="text-sm font-medium uppercase tracking-[0.2em]"
          style={{ color: 'var(--sys-status-muted)' }}
        >
          Swipe up to unlock
        </span>
      </div>
    </motion.div>
  );
};
