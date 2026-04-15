import React from 'react';

import { AnimatePresence, motion } from 'motion/react';
import { Check, Heart, Search, X } from 'lucide-react';

import type { Contact } from '../../contacts/types';
import { LOVE_SPACE_TEXT } from '../constants';
import { ContactAvatar } from './ContactAvatar';

interface AddBondSheetProps {
  isOpen: boolean;
  search: string;
  sinceDateInput: string;
  selectedCount: number;
  filteredContacts: Contact[];
  selectedContactSet: Set<string>;
  existingBondContactSet: Set<string>;
  onClose: () => void;
  onSave: () => void;
  onSearchChange: (value: string) => void;
  onSinceDateInputChange: (value: string) => void;
  onToggleContact: (contactId: string) => void;
}

export const AddBondSheet: React.FC<AddBondSheetProps> = ({
  isOpen,
  search,
  sinceDateInput,
  selectedCount,
  filteredContacts,
  selectedContactSet,
  existingBondContactSet,
  onClose,
  onSave,
  onSearchChange,
  onSinceDateInputChange,
  onToggleContact,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[80] bg-slate-900/20 flex items-end"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 240 }}
            className="w-full h-[84%] rounded-t-[34px] bg-[#fffbfd] border-t border-rose-100/90 shadow-[0_-30px_60px_-45px_rgba(180,130,150,0.2)] flex flex-col"
          >
            <div className="px-5 pt-4 pb-3 border-b border-rose-100/80 flex items-center">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-rose-50 text-rose-400 grid place-items-center active:scale-95 transition-transform"
              >
                <X size={18} />
              </button>
              <h2 className="flex-1 text-center text-[17px] font-bold text-slate-800 pr-8">
                {LOVE_SPACE_TEXT.pickerTitle}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="rounded-full bg-white border border-rose-100 px-3 h-11 flex items-center gap-2 text-slate-400 shadow-[0_8px_24px_-20px_rgba(180,130,150,0.28)]">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={LOVE_SPACE_TEXT.searchPlaceholder}
                  className="w-full bg-transparent outline-none text-[15px] text-slate-700 placeholder:text-slate-400"
                />
              </div>

              <div className="mt-3 rounded-2xl border border-rose-100 bg-white px-3.5 py-3 shadow-[0_10px_28px_-24px_rgba(180,130,150,0.24)]">
                <label className="text-[13px] font-semibold text-slate-700 block mb-1.5">
                  {LOVE_SPACE_TEXT.pickerDateLabel}
                </label>
                <input
                  type="date"
                  value={sinceDateInput}
                  onChange={(event) => onSinceDateInputChange(event.target.value)}
                  className="w-full h-10 rounded-xl border border-rose-200 px-3 text-[14px] text-slate-700 bg-rose-50/55 outline-none focus:ring-2 focus:ring-rose-200/45"
                />
              </div>

              <div className="mt-4 space-y-2.5">
                {filteredContacts.length === 0 ? (
                  <div className="text-center text-slate-400 text-[14px] py-8">
                    {LOVE_SPACE_TEXT.emptyPicker}
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const isSelected = selectedContactSet.has(contact.id);
                    const isBonded = existingBondContactSet.has(contact.id);

                    return (
                      <button
                        key={contact.id}
                        onClick={() => onToggleContact(contact.id)}
                        className={`w-full rounded-2xl border px-3.5 py-3 text-left transition-all ${
                          isSelected
                            ? 'bg-rose-50/85 border-rose-200 shadow-[0_12px_24px_-20px_rgba(180,130,150,0.28)]'
                            : 'bg-white border-rose-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <ContactAvatar contact={contact} sizeClassName="w-11 h-11" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-semibold text-slate-800 truncate">
                              {contact.name}
                            </p>
                            <p className="mt-0.5 text-[12px] text-slate-500 truncate">
                              {contact.role || LOVE_SPACE_TEXT.contactFallbackRole}
                            </p>
                          </div>
                          {isBonded ? (
                            <span className="rounded-full bg-rose-50 text-rose-500 text-[11px] px-2 py-1">
                              {LOVE_SPACE_TEXT.alreadyBonded}
                            </span>
                          ) : null}
                          <div
                            className={`w-6 h-6 rounded-full border-2 grid place-items-center ${
                              isSelected
                                ? 'border-rose-300 bg-rose-200 text-rose-700'
                                : 'border-rose-200 text-transparent'
                            }`}
                          >
                            <Check size={13} />
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-rose-100/80">
              <button
                disabled={selectedCount === 0}
                onClick={onSave}
                className={`w-full h-12 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 transition-all ${
                  selectedCount > 0
                    ? 'bg-rose-50/95 text-rose-500 border border-rose-100 shadow-[0_16px_28px_-20px_rgba(180,130,150,0.26)] active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Heart size={16} className="fill-current" />
                {selectedCount > 0
                  ? `${LOVE_SPACE_TEXT.confirmAddPrefix} ${selectedCount} ${LOVE_SPACE_TEXT.confirmAddSuffix}`
                  : LOVE_SPACE_TEXT.selectFirst}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
