import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Phone, Search, User } from 'lucide-react';
import {
  useContactsSnapshot,
  useSetContactAsWeChatFriend,
} from '../../contacts/selectors';
import { useWaitingRequestContacts } from '../contactAdapter';
import type { WeChatAddFriendViewProps } from '../types';

type AddActionItem = {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  iconColor: string;
};

type AddFriendPanel = 'main' | 'phoneContacts';

const ADD_ACTIONS: AddActionItem[] = [
  {
    key: 'phone',
    title: '手机联系人',
    description: '添加通讯录中的朋友',
    icon: Phone,
    iconColor: 'text-emerald-500',
  },
];

export const WeChatAddFriendView: React.FC<WeChatAddFriendViewProps> = ({ onBack }) => {
  const contacts = useContactsSnapshot();
  const setContactAsWeChatFriend = useSetContactAsWeChatFriend();
  const waitingRequests = useWaitingRequestContacts();

  const [panel, setPanel] = useState<AddFriendPanel>('main');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [phoneSearchKeyword, setPhoneSearchKeyword] = useState('');

  const waitingSearchResults = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return [];
    return waitingRequests.filter((item) =>
      `${item.name} ${item.phone ?? ''} ${item.note ?? ''}`.toLowerCase().includes(keyword)
    );
  }, [searchKeyword, waitingRequests]);

  const sortedPhoneContacts = useMemo(
    () => [...contacts].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    [contacts]
  );

  const phoneSearchResults = useMemo(() => {
    const keyword = phoneSearchKeyword.trim().toLowerCase();
    if (!keyword) return sortedPhoneContacts;
    return sortedPhoneContacts.filter((item) =>
      `${item.name} ${item.phone ?? ''} ${item.note ?? ''} ${item.description ?? ''}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [phoneSearchKeyword, sortedPhoneContacts]);

  const handleActionClick = (actionKey: string) => {
    if (actionKey === 'phone') {
      setPhoneSearchKeyword('');
      setPanel('phoneContacts');
    }
  };

  const handleTopBack = () => {
    if (panel === 'phoneContacts') {
      setPanel('main');
      return;
    }
    onBack();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#EDEDED]">
      <div className="shrink-0 border-b border-gray-200 bg-[#F7F7F7] px-3 pb-3 pt-12 flex items-center">
        <button onClick={handleTopBack} className="flex items-center text-gray-900 active:opacity-50">
          <ChevronLeft size={28} />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-medium text-gray-900 pr-8">
          {panel === 'phoneContacts' ? '手机联系人' : '添加朋友'}
        </h1>
      </div>

      {panel === 'phoneContacts' ? (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-2 pt-3">
            <div className="relative">
              <Search
                size={19}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={phoneSearchKeyword}
                onChange={(event) => setPhoneSearchKeyword(event.target.value)}
                placeholder="搜索通讯录联系人"
                className="h-11 w-full rounded-xl bg-[#F2F2F2] pl-10 pr-3 text-[16px] text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          <section className="bg-white border-y border-gray-200">
            <div className="px-4 py-2 text-[12px] text-gray-500">从通讯录中选择联系人，添加到微信通讯录</div>
            {phoneSearchResults.length === 0 ? (
              <div className="px-4 py-6 text-[13px] text-gray-400">没有匹配到联系人</div>
            ) : (
              phoneSearchResults.map((contact) => {
                const isFriend = contact.wechatRelation === 'friend';
                return (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
                  >
                    <div className="h-12 w-12 rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center text-gray-400">
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover" />
                      ) : (
                        <User size={22} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-medium text-gray-900">{contact.name}</p>
                      <p className="truncate text-[12px] text-gray-500">{contact.phone || contact.note || '通讯录联系人'}</p>
                    </div>
                    {isFriend ? (
                      <span className="rounded-md border border-gray-200 px-3 py-1.5 text-[13px] text-gray-400">已添加</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setContactAsWeChatFriend(contact.id)}
                        className="rounded-md border border-[#07C160] px-3 py-1.5 text-[13px] font-medium text-[#07C160] active:bg-[#07C160]/5"
                      >
                        添加
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-2 pt-3">
            <div className="relative">
              <Search
                size={19}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="搜索 账号/手机号"
                className="h-11 w-full rounded-xl bg-[#F2F2F2] pl-10 pr-3 text-[16px] text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          <section className="mb-2 bg-white border-y border-gray-200">
            {searchKeyword.trim().length === 0 ? (
              <div className="px-4 py-3 text-[12px] text-gray-400">输入联系人姓名、手机号后可发起申请</div>
            ) : waitingSearchResults.length === 0 ? (
              <div className="px-4 py-3 text-[12px] text-gray-400">没有匹配到可申请的联系人</div>
            ) : (
              waitingSearchResults.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
                >
                  <div className="h-12 w-12 rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center text-gray-400">
                    {contact.avatar ? (
                      <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover" />
                    ) : (
                      <User size={22} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-medium text-gray-900">{contact.name}</p>
                    <p className="truncate text-[12px] text-gray-500">{contact.phone || contact.note || '可发起好友申请'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContactAsWeChatFriend(contact.id)}
                    className="rounded-md border border-[#07C160] px-3 py-1.5 text-[13px] font-medium text-[#07C160] active:bg-[#07C160]/5"
                  >
                    发起申请
                  </button>
                </div>
              ))
            )}
          </section>

          <section className="bg-white border-y border-gray-200">
            {ADD_ACTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleActionClick(item.key)}
                  className="flex w-full items-center gap-4 border-b border-gray-100 px-4 py-4 text-left last:border-b-0 active:bg-gray-50"
                >
                  <div className={`flex h-10 w-10 items-center justify-center ${item.iconColor}`}>
                    <Icon size={26} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[18px] leading-6 text-gray-900">{item.title}</div>
                    <div className="truncate text-[14px] text-gray-400">{item.description}</div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300" />
                </button>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
};
