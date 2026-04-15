import React from 'react';
import { ChevronLeft, User } from 'lucide-react';
import { useSetContactAsWeChatFriend } from '../../contacts/selectors';
import { useIncomingRequestContacts } from '../contactAdapter';
import type { WeChatNewFriendsViewProps } from '../types';

export const WeChatNewFriendsView: React.FC<WeChatNewFriendsViewProps> = ({ onBack }) => {
  const setContactAsWeChatFriend = useSetContactAsWeChatFriend();
  const incomingRequests = useIncomingRequestContacts();
  const isEmpty = incomingRequests.length === 0;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#EDEDED]">
      <div className="shrink-0 border-b border-gray-200 bg-[#F7F7F7] px-3 pb-3 pt-12 flex items-center">
        <button onClick={onBack} className="flex items-center text-[#07C160] active:opacity-50">
          <ChevronLeft size={28} />
          <span className="text-[17px]">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-medium text-gray-900 pr-8">新的朋友</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {isEmpty ? (
          <div className="mt-20 px-8 text-center text-[14px] text-gray-500">暂无新的好友申请</div>
        ) : (
          <section className="mb-2 bg-white border-y border-gray-200">
            <div className="px-4 py-2 text-[12px] text-gray-500">好友申请</div>
            {incomingRequests.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                <div className="h-12 w-12 rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center text-gray-400">
                  {contact.avatar ? (
                    <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover" />
                  ) : (
                    <User size={22} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-medium text-gray-900">{contact.name}</p>
                  <p className="truncate text-[12px] text-gray-500">向你发送了好友申请</p>
                </div>
                <button
                  type="button"
                  onClick={() => setContactAsWeChatFriend(contact.id)}
                  className="rounded-md border border-[#07C160] px-3 py-1.5 text-[13px] font-medium text-[#07C160] active:bg-[#07C160]/5"
                >
                  接受
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};


