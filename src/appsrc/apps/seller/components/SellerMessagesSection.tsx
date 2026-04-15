import React from 'react';
import { Send } from 'lucide-react';
import styles from '../SellerApp.module.css';
import type { ChatThread } from '../types';

type SellerMessagesSectionProps = {
  chatThreads: ChatThread[];
  activeChatThread: ChatThread | null;
  chatDraft: string;
  onSelectThread: (id: string) => void;
  onDraftChange: (value: string) => void;
  onSendReply: () => void;
};

export const SellerMessagesSection: React.FC<SellerMessagesSectionProps> = ({
  chatThreads,
  activeChatThread,
  chatDraft,
  onSelectThread,
  onDraftChange,
  onSendReply,
}) => {
  return (
    <section className={styles.card}>
      <div className={styles.actionRowSplit}>
        <h3>即时消息</h3>
        <p className={styles.tip}>按店铺和买家分组，点开会话后可直接回复</p>
      </div>

      {chatThreads.length === 0 ? (
        <p className={styles.empty}>暂无买家消息</p>
      ) : (
        <div className={styles.messagePanel}>
          <div className={styles.threadList}>
            {chatThreads.map((thread) => {
              const lastMessage = thread.messages[thread.messages.length - 1];
              return (
                <button
                  key={thread.id}
                  className={`${styles.threadItem} ${
                    activeChatThread?.id === thread.id ? styles.threadItemActive : ''
                  }`}
                  onClick={() => onSelectThread(thread.id)}
                >
                  <div className={styles.threadTitleRow}>
                    <strong>{thread.buyerName}</strong>
                    <span>{new Date(thread.latestAt).toLocaleString('zh-CN')}</span>
                  </div>
                  <div className={styles.threadMeta}>
                    <span className={styles.badge}>{thread.storeName}</span>
                    <span>{lastMessage?.text || ''}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {activeChatThread && (
            <div className={styles.chatWindow}>
              <div className={styles.chatHeader}>
                <div>
                  <strong>{activeChatThread.buyerName}</strong>
                  <p className={styles.tip}>{activeChatThread.storeName}</p>
                </div>
                <span className={styles.badge}>沟通中</span>
              </div>

              <div className={styles.chatMessages}>
                {activeChatThread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles.chatBubbleRow} ${
                      message.sender === 'seller'
                        ? styles.chatBubbleRowSeller
                        : styles.chatBubbleRowBuyer
                    }`}
                  >
                    <div
                      className={`${styles.chatBubble} ${
                        message.sender === 'seller'
                          ? styles.chatBubbleSeller
                          : styles.chatBubbleBuyer
                      }`}
                    >
                      <p>{message.text}</p>
                      <span>
                        {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.chatComposer}>
                <input
                  value={chatDraft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  placeholder="请输入回复内容"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onSendReply();
                    }
                  }}
                />
                <button className={styles.btn} onClick={onSendReply} disabled={!chatDraft.trim()}>
                  <Send size={14} /> 发送
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
