import React from 'react';
import { ChevronLeft, Grid2X2, Plus } from 'lucide-react';
import type { ContactsBottomTab } from '../uiTypes';

interface ContactsTopBarProps {
  activeTab: ContactsBottomTab;
  onClose: () => void;
  onAddContact: () => void;
  showAddContactAction?: boolean;
}

export const ContactsTopBar: React.FC<ContactsTopBarProps> = ({
  activeTab,
  onClose,
  onAddContact,
  showAddContactAction = true,
}) => {
  return (
    <div className="pt-11 px-5 pb-1 bg-white flex items-center justify-between shrink-0">
      <button onClick={onClose} className="text-slate-600">
        <ChevronLeft size={26} />
      </button>

      {activeTab === 'contacts' && showAddContactAction ? (
        <div className="flex items-center gap-2.5">
          <button onClick={onAddContact} className="text-slate-800" aria-label="add-contact">
            <Plus size={28} />
          </button>
          <button className="text-slate-700" aria-label="more-grid">
            <Grid2X2 size={22} />
          </button>
        </div>
      ) : (
        <div className="w-8" />
      )}
    </div>
  );
};
