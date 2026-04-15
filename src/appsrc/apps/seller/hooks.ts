import React from 'react';
import type { CommerceStore, Order } from '../../shared/business/commerce/domain/types';
import { formatMoney, isOrderInTransit, resolveOrderStoreId } from '../../shared/business/commerce/domain/utils';
import type { ChatMessage, ChatThread } from './types';

type SellerRepliesMap = Record<string, ChatMessage[]>;

type UseSellerStatsParams = {
  orders: Order[];
  stores: CommerceStore[];
  statsTypeFilter: string;
  getBuyerName: (order: Order) => string;
  repairText: (value?: string) => string;
};

export const useSellerStats = ({
  orders,
  stores,
  statsTypeFilter,
  getBuyerName,
  repairText,
}: UseSellerStatsParams) => {
  const stats = React.useMemo(() => {
    const periodStart = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = orders.filter((order) => order.createdAt >= periodStart);
    const byStore = stores.map((store) => {
      const related = recent.filter((order) => resolveOrderStoreId(order) === store.id);
      return {
        store,
        revenue: related.reduce((sum, order) => sum + order.total, 0),
        orderCount: related.length,
        inTransit: related.filter((order) => isOrderInTransit(order)).length,
      };
    });
    const personMap = new Map<string, number>();
    recent.forEach((order) =>
      personMap.set(getBuyerName(order), (personMap.get(getBuyerName(order)) || 0) + 1)
    );
    const ranking = [...personMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return { byStore, ranking };
  }, [orders, stores, getBuyerName]);

  const filteredStatsByStore = React.useMemo(() => {
    if (statsTypeFilter === 'all') return stats.byStore;
    return stats.byStore.filter(
      (item) => repairText(item.store.typeName || item.store.name) === statsTypeFilter
    );
  }, [stats.byStore, statsTypeFilter, repairText]);

  const statsTypeTabs = React.useMemo(() => {
    const seen = new Set<string>();
    const tabs: string[] = [];
    stores.forEach((store) => {
      const typeName = repairText(store.typeName || store.name);
      if (!typeName || seen.has(typeName)) return;
      seen.add(typeName);
      tabs.push(typeName);
    });
    return tabs;
  }, [stores, repairText]);

  return { stats, filteredStatsByStore, statsTypeTabs };
};

type UseSellerChatParams = {
  orders: Order[];
  stores: CommerceStore[];
  sellerReplies: SellerRepliesMap;
  selectedChatThreadId: string;
  setSelectedChatThreadId: React.Dispatch<React.SetStateAction<string>>;
  chatDraft: string;
  setChatDraft: React.Dispatch<React.SetStateAction<string>>;
  setSellerReplies: React.Dispatch<React.SetStateAction<SellerRepliesMap>>;
  getBuyerName: (order: Order) => string;
  repairText: (value?: string) => string;
  getDefaultStoreIdByKind: (kind: Order['kind']) => string;
};

export const useSellerChat = ({
  orders,
  stores,
  sellerReplies,
  selectedChatThreadId,
  setSelectedChatThreadId,
  chatDraft,
  setChatDraft,
  setSellerReplies,
  getBuyerName,
  repairText,
  getDefaultStoreIdByKind,
}: UseSellerChatParams) => {
  const chatThreads = React.useMemo(() => {
    const grouped = new Map<
      string,
      {
        id: string;
        storeId: string;
        storeName: string;
        buyerName: string;
        messages: ChatMessage[];
      }
    >();

    orders.forEach((order) => {
      const storeId = resolveOrderStoreId(order) || getDefaultStoreIdByKind(order.kind);
      const store = stores.find((item) => item.id === storeId);
      if (!store) return;
      const buyerName = repairText(getBuyerName(order)) || '匿名买家';
      const threadId = `${store.id}::${buyerName}`;
      const storeName = repairText(store.signboard || store.name) || '店铺';
      const buyerMessage: ChatMessage = {
        id: `order-${order.id}`,
        sender: 'buyer',
        text: `订单 ${order.id}，金额 ${formatMoney(order.total)}，想咨询一下进度。`,
        createdAt: order.createdAt,
      };

      const current = grouped.get(threadId);
      if (!current) {
        grouped.set(threadId, {
          id: threadId,
          storeId: store.id,
          storeName,
          buyerName,
          messages: [buyerMessage],
        });
        return;
      }
      if (!current.messages.some((item) => item.id === buyerMessage.id)) {
        current.messages.push(buyerMessage);
      }
    });

    return Array.from(grouped.values())
      .map((thread): ChatThread => {
        const replyMessages = sellerReplies[thread.id] || [];
        const messages = [...thread.messages, ...replyMessages].sort((a, b) => a.createdAt - b.createdAt);
        return {
          ...thread,
          messages,
          latestAt: messages[messages.length - 1]?.createdAt || 0,
        };
      })
      .sort((a, b) => b.latestAt - a.latestAt);
  }, [orders, sellerReplies, stores, getBuyerName, repairText, getDefaultStoreIdByKind]);

  const activeChatThread = React.useMemo(
    () => chatThreads.find((item) => item.id === selectedChatThreadId) || chatThreads[0] || null,
    [chatThreads, selectedChatThreadId]
  );

  React.useEffect(() => {
    if (chatThreads.length === 0) {
      if (selectedChatThreadId) setSelectedChatThreadId('');
      return;
    }
    if (!selectedChatThreadId || !chatThreads.some((item) => item.id === selectedChatThreadId)) {
      setSelectedChatThreadId(chatThreads[0].id);
    }
  }, [chatThreads, selectedChatThreadId, setSelectedChatThreadId]);

  const sendChatReply = React.useCallback(() => {
    const text = chatDraft.trim();
    if (!activeChatThread || !text) return;
    const message: ChatMessage = {
      id: `seller-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'seller',
      text,
      createdAt: Date.now(),
    };
    setSellerReplies((prev) => ({
      ...prev,
      [activeChatThread.id]: [...(prev[activeChatThread.id] || []), message],
    }));
    setChatDraft('');
  }, [activeChatThread, chatDraft, setSellerReplies, setChatDraft]);

  return { chatThreads, activeChatThread, sendChatReply };
};
