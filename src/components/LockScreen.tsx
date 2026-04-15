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
      onClick={onUnlock}
    >
      {/* Background with more blur */}
      <div className="absolute inset-0 z-0 bg-[#8fb6c7]">
        <img 
          src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=2000&auto=format&fit=crop" 
          alt="Wallpaper" 
          className="w-full h-full object-cover scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2">
        <Lock size={24} className="text-white/60 mb-4" />
        <span className="text-8xl font-thin tracking-tighter">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
        <span className="text-xl font-medium text-white/80">
          {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-12 h-12 glass rounded-full flex items-center justify-center animate-bounce">
          <motion.div 
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-1.5 h-1.5 border-t-2 border-l-2 border-white rotate-45"
          />
        </div>
        <span className="text-sm font-medium text-white/40 uppercase tracking-[0.2em]">Swipe up to unlock</span>
      </div>
    </motion.div>
  );
};
