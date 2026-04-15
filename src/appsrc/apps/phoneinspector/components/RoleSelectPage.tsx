import React from 'react';
import { ShieldCheck, Smartphone, UserRound, X } from 'lucide-react';
import type { ContactSnapshot } from '../../../shared/business/contacts/snapshotBridge';

const AVATAR_BG_PALETTE = ['bg-slate-300', 'bg-blue-200', 'bg-emerald-200', 'bg-purple-200', 'bg-amber-200'];

const getInitial = (name: string): string => {
  const first = name.trim().slice(0, 1).toUpperCase();
  return first || '#';
};

const getAvatarColor = (name: string): string => {
  const seed = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_BG_PALETTE[seed % AVATAR_BG_PALETTE.length];
};

interface RoleSelectPageProps {
  contacts: ContactSnapshot[];
  onClose: () => void;
  onSelectContact: (contactId: string) => void;
}

export const RoleSelectPage: React.FC<RoleSelectPageProps> = ({
  contacts,
  onClose,
  onSelectContact,
}) => {
  return (
    <>
      <div
        className="px-4 pb-3 grid grid-cols-[32px_1fr_32px] items-center border-b border-slate-200/90 bg-white/70 backdrop-blur"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}
      >
        <div className="h-8 w-8" />

        <h1 className="text-center text-[17px] font-semibold tracking-wide">查手机</h1>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 active:bg-slate-300"
          aria-label="关闭查手机"
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px] text-emerald-700 flex items-center gap-2">
          <ShieldCheck size={15} />
          选择一个通讯录角色后，将以该角色身份进入手机视角。
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
        {contacts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">
            暂无通讯录角色可查看
          </div>
        ) : (
          contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelectContact(contact.id)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_6px_20px_-16px_rgba(15,23,42,0.3)] active:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-[17px] font-semibold text-slate-700">
                  {contact.avatar ? (
                    <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover" />
                  ) : (
                    <span
                      className={`${getAvatarColor(contact.name)} h-full w-full flex items-center justify-center text-slate-800`}
                    >
                      {contact.name ? getInitial(contact.name) : <UserRound size={16} />}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-medium text-slate-900">{contact.name}</p>
                  <p className="truncate text-[12px] text-slate-500">
                    {contact.role || contact.note || '通讯录联系人'}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] text-sky-700">
                  <Smartphone size={12} />
                  查看
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
};
