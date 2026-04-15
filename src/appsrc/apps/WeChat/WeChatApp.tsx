import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Phone, Plus } from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { useStoredActiveRoleId } from '../contacts/activeRole';
import { isContactRoleId } from '../../shared/business/roleIdentity';
import { clearRuntimeActiveRoleId, useRoleRuntimeStore } from '../../shared/business/roleRuntime';
import {
  WeChatAddFriendView,
  WeChatAiChatContextConfigView,
  WeChatAiMomentsConfigView,
  WeChatChatUiOptimizeView,
  ContactProfileView,
  EditCharacterView,
  EditMyNameView,
  EditMyPatSettingView,
  EditMyProfileView,
  WeChatChats,
  WeChatChatView,
  WeChatContacts,
  WeChatDiscover,
  WeChatMomentsView,
  WeChatMomentsSettingsView,
  WeChatNewFriendsView,
  WeChatProfile,
  WeChatSettingsView,
  WeChatTabBar,
} from './components';
import type { WeChatAppProps, WeChatTab, WeChatView, WeChatVoiceCallUiState } from './types';
import { useWeChatStore } from './store';
import { WeChatBalanceView } from './components/WeChatBalanceView';
import { WeChatServicesView } from './components/WeChatServicesView';
import { WeChatBillView } from './components/WeChatBillView';
import { WeChatTopUpView } from './components/WeChatTopUpView';
import { WeChatWalletView } from './components/WeChatWalletView';
import { WeChatWithdrawView } from './components/WeChatWithdrawView';

const TAB_TITLE: Record<WeChatTab, string> = {
  chat: '微信',
  contacts: '通讯录',
  discover: '发现',
  profile: '我',
};

export const WeChatApp: React.FC<WeChatAppProps> = ({ onClose, context }) => {
  const storedActiveRoleId = useStoredActiveRoleId();
  const runtimeRoleId = useRoleRuntimeStore((state) => state.overrideRoleId);
  const isInspectorMode = context?.params?.mode === 'inspector';
  const effectiveRoleId =
    (isInspectorMode ? runtimeRoleId || storedActiveRoleId : storedActiveRoleId) ||
    storedActiveRoleId;
  const isInspectorContactRoleMode = isInspectorMode && isContactRoleId(effectiveRoleId);
  const syncWeChatRoleContext = useWeChatStore((state) => state.syncWeChatRoleContext);
  const [activeTab, setActiveTab] = useState<WeChatTab>('chat');
  const [currentView, setCurrentView] = useState<WeChatView>('main');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [momentsAuthorId, setMomentsAuthorId] = useState<string | null>(null);
  const [voiceCallUiState, setVoiceCallUiState] = useState<WeChatVoiceCallUiState | null>(null);
  const [restoreVoiceCallSignal, setRestoreVoiceCallSignal] = useState(0);
  const [voiceCallStartedAt, setVoiceCallStartedAt] = useState<number | null>(null);
  const [voiceCallElapsedSeconds, setVoiceCallElapsedSeconds] = useState(0);

  const isVoiceCallActive = Boolean(voiceCallUiState?.active);
  const showVoiceCallFloatingEntry = Boolean(
    currentView === 'chat' &&
      voiceCallUiState?.active &&
      voiceCallUiState?.minimized &&
      selectedCharacterId &&
      selectedCharacterId === voiceCallUiState.characterId
  );

  useEffect(() => {
    if (isInspectorMode) return;
    if (!runtimeRoleId) return;
    clearRuntimeActiveRoleId();
  }, [isInspectorMode, runtimeRoleId]);

  useEffect(() => {
    syncWeChatRoleContext();
  }, [effectiveRoleId, syncWeChatRoleContext]);

  useEffect(() => {
    if (!isInspectorContactRoleMode) return;
    if (currentView === 'main' || currentView === 'chat') return;
    setCurrentView('main');
  }, [currentView, isInspectorContactRoleMode]);

  const handleVoiceCallUiStateChange = useCallback((nextState: WeChatVoiceCallUiState) => {
    setVoiceCallUiState((prev) => {
      if (!nextState.active) return null;
      if (
        prev &&
        prev.active === nextState.active &&
        prev.minimized === nextState.minimized &&
        prev.characterId === nextState.characterId &&
        prev.characterName === nextState.characterName &&
        prev.characterAvatar === nextState.characterAvatar
      ) {
        return prev;
      }
      return nextState;
    });
    if (!nextState.active) return;
  }, []);

  // 离开聊天页面即终止语音通话
  useEffect(() => {
    if (currentView === 'chat') return;
    if (!voiceCallUiState?.active) return;
    setVoiceCallUiState(null);
  }, [currentView, voiceCallUiState?.active]);

  const handleRestoreVoiceCall = useCallback(() => {
    if (!voiceCallUiState?.active) return;
    setRestoreVoiceCallSignal((prev) => prev + 1);
    if (selectedCharacterId !== voiceCallUiState.characterId) {
      setSelectedCharacterId(voiceCallUiState.characterId);
    }
    setCurrentView('chat');
  }, [voiceCallUiState, selectedCharacterId]);

  const handleRestoreVoiceCallPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      handleRestoreVoiceCall();
    },
    [handleRestoreVoiceCall]
  );

  const trySwitchChatTarget = useCallback(
    (nextCharacterId: string): boolean => {
      if (isVoiceCallActive && selectedCharacterId && nextCharacterId !== selectedCharacterId) {
        setVoiceCallUiState(null);
      }
      setSelectedCharacterId(nextCharacterId);
      return true;
    },
    [isVoiceCallActive, selectedCharacterId]
  );

  const handleBack = () => {
    if (currentView === 'moments') {
      if (momentsAuthorId && selectedCharacterId) {
        setMomentsAuthorId(null);
        setCurrentView('contactProfile');
        return;
      }
      setCurrentView('main');
      return;
    }
    if (['chat', 'newFriends', 'addFriend', 'settings', 'contactProfile', 'editMyProfile', 'services'].includes(currentView)) {
      if (currentView === 'chat' && isVoiceCallActive) {
        setVoiceCallUiState(null);
      }
      setCurrentView('main');
      return;
    }
    if (
      currentView === 'chatUiOptimize' ||
      currentView === 'aiChatContextConfig' ||
      currentView === 'momentsSettings' ||
      currentView === 'aiMomentsConfig'
    ) {
      setCurrentView('settings');
      return;
    }
    if (currentView === 'editCharacter') {
      setCurrentView('contactProfile');
      return;
    }
    if (currentView === 'editMyName') {
      setCurrentView('editMyProfile');
      return;
    }
    if (currentView === 'editPatSetting') {
      setCurrentView('editMyProfile');
      return;
    }
    if (currentView === 'wallet') {
      setCurrentView('services');
      return;
    }
    if (currentView === 'bill') {
      setCurrentView('wallet');
      return;
    }
    if (currentView === 'balance') {
      setCurrentView('wallet');
      return;
    }
    if (currentView === 'topUp' || currentView === 'withdraw') {
      setCurrentView('balance');
    }
  };

  const handleSelectChat = (characterId: string) => {
    if (!trySwitchChatTarget(characterId)) return;
    setCurrentView('chat');
  };

  const handleSelectContact = (characterId: string) => {
    if (isInspectorContactRoleMode) return;
    if (!trySwitchChatTarget(characterId)) return;
    setCurrentView('contactProfile');
  };

  useEffect(() => {
    if (voiceCallUiState?.active) {
      setVoiceCallStartedAt((prev) => prev ?? Date.now());
      return;
    }
    setVoiceCallStartedAt(null);
    setVoiceCallElapsedSeconds(0);
  }, [voiceCallUiState?.active]);

  useEffect(() => {
    if (!voiceCallUiState?.active || !voiceCallStartedAt) return;
    setVoiceCallElapsedSeconds(Math.max(0, Math.floor((Date.now() - voiceCallStartedAt) / 1000)));
    const timer = window.setInterval(() => {
      setVoiceCallElapsedSeconds(Math.max(0, Math.floor((Date.now() - voiceCallStartedAt) / 1000)));
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [voiceCallUiState?.active, voiceCallStartedAt]);

  const formatCallDuration = (totalSeconds: number) => {
    const safe = Math.max(0, totalSeconds);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-[#EDEDED] flex flex-col"
    >
      <AnimatePresence mode="wait">
        {currentView === 'main' && (
          <motion.div
            key="main-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {activeTab !== 'profile' && (
              <div className="bg-[#F7F7F7] px-3 pt-12 pb-3 flex items-center border-b border-gray-200 shrink-0">
                <button onClick={onClose} className="text-[#07C160] flex items-center gap-1 active:opacity-50">
                  <ChevronLeft size={28} />
                  <span className="text-[17px]">返回</span>
                </button>
                <h1 className="flex-1 text-center text-[17px] font-medium text-gray-900">
                  {TAB_TITLE[activeTab]}
                </h1>
                {activeTab === 'contacts' && !isInspectorContactRoleMode ? (
                  <button
                    type="button"
                    onClick={() => setCurrentView('addFriend')}
                    className="flex h-8 w-8 items-center justify-center text-gray-900 active:opacity-50"
                    aria-label="添加朋友"
                    title="添加朋友"
                  >
                    <Plus size={22} />
                  </button>
                ) : (
                  <div className="w-8" />
                )}
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-hidden relative">
              {activeTab === 'chat' && (
                <div className="absolute inset-0">
                  <WeChatChats onSelectChat={handleSelectChat} />
                </div>
              )}
              {activeTab === 'contacts' && (
                <div className="absolute inset-0">
                  <WeChatContacts
                    onSelectContact={handleSelectContact}
                    onOpenNewFriends={() => {
                      if (isInspectorContactRoleMode) return;
                      setCurrentView('newFriends');
                    }}
                  />
                </div>
              )}
              {activeTab === 'discover' && (
                <div className="absolute inset-0 overflow-y-auto">
                  <WeChatDiscover
                    onMomentsClick={() => {
                      if (isInspectorContactRoleMode) return;
                      setMomentsAuthorId(null);
                      setCurrentView('moments');
                    }}
                  />
                </div>
              )}
              {activeTab === 'profile' && (
                <div className="absolute inset-0 overflow-y-auto">
                  <WeChatProfile
                    onClose={onClose}
                    onEditProfile={() => {
                      if (isInspectorContactRoleMode) return;
                      setCurrentView('editMyProfile');
                    }}
                    onServicesClick={() => {
                      if (isInspectorContactRoleMode) return;
                      setCurrentView('services');
                    }}
                    onMomentsClick={() => {
                      if (isInspectorContactRoleMode) return;
                      setMomentsAuthorId(null);
                      setCurrentView('moments');
                    }}
                    onSettingsClick={() => {
                      if (isInspectorContactRoleMode) return;
                      setCurrentView('settings');
                    }}
                    readOnly={isInspectorContactRoleMode}
                  />
                </div>
              )}
            </div>

            <div className="h-14 shrink-0">
              <WeChatTabBar activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </motion.div>
        )}

        {currentView === 'newFriends' && (
          <WeChatNewFriendsView key="new-friends" onBack={handleBack} />
        )}

        {currentView === 'addFriend' && (
          <WeChatAddFriendView key="add-friend" onBack={handleBack} />
        )}

        {currentView === 'moments' && (
          <WeChatMomentsView key={`moments-${momentsAuthorId ?? 'all'}`} onBack={handleBack} focusAuthorId={momentsAuthorId} />
        )}

        {currentView === 'settings' && (
          <WeChatSettingsView
            key="settings"
            onBack={handleBack}
            onChatUiOptimizeClick={() => setCurrentView('chatUiOptimize')}
            onAiChatContextConfigClick={() => setCurrentView('aiChatContextConfig')}
            onMomentsSettingsClick={() => setCurrentView('momentsSettings')}
            onAiMomentsConfigClick={() => setCurrentView('aiMomentsConfig')}
          />
        )}

        {currentView === 'chatUiOptimize' && (
          <WeChatChatUiOptimizeView key="chat-ui-optimize" onBack={handleBack} />
        )}

        {currentView === 'aiChatContextConfig' && (
          <WeChatAiChatContextConfigView key="ai-chat-context-config" onBack={handleBack} />
        )}

        {currentView === 'momentsSettings' && (
          <WeChatMomentsSettingsView key="moments-settings" onBack={handleBack} />
        )}

        {currentView === 'aiMomentsConfig' && (
          <WeChatAiMomentsConfigView key="ai-moments-config" onBack={handleBack} />
        )}

        {currentView === 'contactProfile' && selectedCharacterId && (
          <ContactProfileView
            key="contact-profile"
            characterId={selectedCharacterId}
            onBack={handleBack}
            onSendMessage={(id) => {
              if (!trySwitchChatTarget(id)) return;
              setCurrentView('chat');
            }}
            onEditProfile={(id) => {
              if (!trySwitchChatTarget(id)) return;
              setCurrentView('editCharacter');
            }}
            onMomentsClick={(id) => {
              setMomentsAuthorId(id);
              setCurrentView('moments');
            }}
          />
        )}

        {currentView === 'editCharacter' && selectedCharacterId && (
          <EditCharacterView key="edit-character" characterId={selectedCharacterId} onBack={handleBack} />
        )}

        {currentView === 'editMyProfile' && (
          <EditMyProfileView
            key="edit-my-profile"
            onBack={handleBack}
            onEditName={() => setCurrentView('editMyName')}
            onEditPatSetting={() => setCurrentView('editPatSetting')}
          />
        )}

        {currentView === 'editMyName' && <EditMyNameView key="edit-my-name" onBack={handleBack} />}
        {currentView === 'editPatSetting' && (
          <EditMyPatSettingView key="edit-my-pat-setting" onBack={handleBack} />
        )}

        {currentView === 'services' && (
          <WeChatServicesView key="services" onBack={handleBack} onWalletClick={() => setCurrentView('wallet')} />
        )}

        {currentView === 'wallet' && (
          <WeChatWalletView
            key="wallet"
            onBack={handleBack}
            onBalanceClick={() => setCurrentView('balance')}
            onBillClick={() => setCurrentView('bill')}
          />
        )}

        {currentView === 'bill' && <WeChatBillView key="bill" onBack={handleBack} />}

        {currentView === 'balance' && (
          <WeChatBalanceView
            key="balance"
            onBack={handleBack}
            onTopUpClick={() => setCurrentView('topUp')}
            onWithdrawClick={() => setCurrentView('withdraw')}
          />
        )}

        {currentView === 'topUp' && <WeChatTopUpView key="topup" onBack={handleBack} />}
        {currentView === 'withdraw' && <WeChatWithdrawView key="withdraw" onBack={handleBack} />}
      </AnimatePresence>

      {selectedCharacterId && currentView === 'chat' && (
        <div className="absolute inset-0 z-[80]">
          <WeChatChatView
            key="chat-view-persistent"
            characterId={selectedCharacterId}
            onBack={handleBack}
            restoreVoiceCallSignal={restoreVoiceCallSignal}
            onVoiceCallUiStateChange={handleVoiceCallUiStateChange}
            readOnly={isInspectorContactRoleMode}
          />
        </div>
      )}

      {showVoiceCallFloatingEntry && (
        <button
          type="button"
          onPointerDown={handleRestoreVoiceCallPointerDown}
          className="absolute right-4 top-1/2 z-[220] pointer-events-auto flex h-10 -translate-y-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)] active:opacity-85"
          style={{ touchAction: 'manipulation' }}
          aria-label="恢复语音通话"
          title={voiceCallUiState?.characterName ? `${voiceCallUiState.characterName} 语音通话中` : '语音通话中'}
        >
          <Phone size={14} strokeWidth={2.4} />
          <span className="text-[12px] font-semibold tabular-nums">{formatCallDuration(voiceCallElapsedSeconds)}</span>
        </button>
      )}
    </motion.div>
  );
};

export type { WeChatAppProps };
