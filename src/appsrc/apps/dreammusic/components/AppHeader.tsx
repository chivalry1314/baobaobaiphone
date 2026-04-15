import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface AppHeaderProps {
  onBack: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onBack }) => (
  <header className="px-4 pt-12 pb-2">
    <button
      type="button"
      onClick={onBack}
      className="h-9 w-9 rounded-full bg-white/10 border border-white/15 inline-flex items-center justify-center"
      aria-label="返回"
    >
      <ChevronLeft size={19} />
    </button>
  </header>
);
