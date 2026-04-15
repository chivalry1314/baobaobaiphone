import React from 'react';
import { Minus } from 'lucide-react';
import type { SymptomOption } from '../symptoms';

interface SymptomGridItemProps {
  symptom: SymptomOption;
  selected: boolean;
  isDeleteMode: boolean;
  onPress: () => void;
}

const SymptomCircle: React.FC<{ icon: string; selected: boolean }> = ({ icon, selected }) => {
  const isImageIcon = icon.trim().startsWith('data:image/');

  return (
    <span
      className={`w-[72px] h-[72px] rounded-full grid place-items-center text-[30px] ${
        selected
          ? 'bg-gradient-to-br from-[#ff7eb4] to-[#ff4f93] text-white shadow-[0_10px_20px_-12px_rgba(244,77,143,0.55)]'
          : 'bg-gradient-to-br from-[#ffd9e8] to-[#ffc6dc]'
      }`}
    >
      {isImageIcon ? (
        <img
          src={icon}
          alt=""
          className={`w-[66px] h-[66px] rounded-full object-cover ${selected ? 'ring-2 ring-white/70' : ''}`}
        />
      ) : (
        icon
      )}
    </span>
  );
};

export const SymptomGridItem: React.FC<SymptomGridItemProps> = ({ symptom, selected, isDeleteMode, onPress }) => (
  <button
    type="button"
    onClick={onPress}
    className={`relative flex flex-col items-center text-center transition-transform ${
      isDeleteMode ? 'active:opacity-80' : 'active:scale-95'
    }`}
  >
    <SymptomCircle icon={symptom.icon} selected={isDeleteMode ? false : selected} />
    {isDeleteMode ? (
      <span className="absolute top-0 right-2 w-5 h-5 rounded-full bg-[#ff5d95] text-white grid place-items-center shadow-[0_8px_18px_-12px_rgba(244,77,143,0.8)]">
        <Minus size={12} strokeWidth={3} />
      </span>
    ) : null}
    <span
      className={`mt-2 text-[14px] leading-tight ${
        isDeleteMode ? 'text-slate-800' : selected ? 'text-[#e95493] font-medium' : 'text-slate-800'
      }`}
    >
      {symptom.label}
    </span>
  </button>
);
